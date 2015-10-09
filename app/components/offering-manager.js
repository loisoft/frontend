import Ember from 'ember';
import DS from 'ember-data';
import moment from 'moment';

const { computed, isEmpty, ObjectProxy, RSVP } = Ember;
const { alias, notEmpty } = computed;
const { all, Promise } = RSVP;
const { PromiseArray } = DS;

export default Ember.Component.extend({
  currentUser: Ember.inject.service(),
  offering: null,
  isEditing: false,
  editable: true,
  sortBy: ['lastName', 'firstName'],
  classNames: ['offering-manager'],
  sortedInstructors: Ember.computed.sort('instructors', 'sortBy'),
  startTime: null,
  endTime: null,
  room: null,
  isMultiDay: false,
  cohorts: Ember.computed.alias('offering.session.course.cohorts'),
  availableInstructorGroups: Ember.computed.alias('offering.session.course.school.instructorGroups'),
  showRemoveConfirmation: false,
  buffer: null,
  allInstructors: function(){
    var self = this;
    var defer = Ember.RSVP.defer();
    var instructorGroups = this.get('instructorGroups');
    var promises = instructorGroups.getEach('users');
    promises.pushObject(self.get('instructors'));
    Ember.RSVP.all(promises).then(function(trees){
      var instructors = trees.reduce(function(array, set){
          return array.pushObjects(set.toArray());
      }, []);
      instructors = instructors.uniq().sortBy('lastName', 'firstName');
      defer.resolve(instructors);
    });
    return DS.PromiseArray.create({
      promise: defer.promise
    });
  }.property('instructors.@each', 'instructorGroups.@each.users.@each'),

  learnerGroups: alias('buffer.learnerGroups'),

  filteredCohorts: computed('cohorts.[]', 'learnerGroups.[]', 'filter', function(){
    let cohortProxy = ObjectProxy.extend({
      selectedLearnerGroups: [],

      hasAvailableLearnerGroups: notEmpty('filteredAvailableLearnerGroups'),

      filter: '',

      filteredAvailableLearnerGroups: computed('content.learnerGroups.[]', 'content.learnerGroups.@each.allDescendants.[]', 'selectedLearnerGroups.[]', 'filter', function(){
        let defer = RSVP.defer();
        let proxy = this;
        let filter = proxy.get('filter');
        let exp = new RegExp(filter, 'gi');

        let activeGroupFilter = function(learnerGroup) {
          let searchTerm = `${learnerGroup.get('title')}${learnerGroup.get('allParentsTitle')}`;

          return (
            learnerGroup.get('title') !== undefined &&
            proxy.get('selectedLearnerGroups') &&
            exp.test(searchTerm) &&
            !proxy.get('selectedLearnerGroups').contains(learnerGroup)
          );
        };

        this.get('content.topLevelLearnerGroups').then((cohortGroups) => {
          let learnerGroups = [];
          let promises = [];

          cohortGroups.forEach((learnerGroup) => {
            learnerGroups.pushObject(learnerGroup);

            let promise = new Promise((resolve) => {
              learnerGroup.get('allDescendants').then((descendants) => {
                learnerGroups.pushObjects(descendants);
                resolve();
              });
            });

            promises.pushObject(promise);
          });

          all(promises).then(() => {
            defer.resolve(learnerGroups.filter(activeGroupFilter).sortBy('sortTitle'));
          });
        });

        return PromiseArray.create({
          promise: defer.promise
        });
      }),
    });

    let cohorts = this.get('cohorts') ? this.get('cohorts') : [];

    return cohorts.map((cohort) => {
      let proxy = cohortProxy.create({
        content: cohort,
        selectedLearnerGroups: this.get('learnerGroups')
      });

      return proxy;
    }).sortBy('title');
  }),

  actions: {
    save() {
      var offering = this.get('offering');
      let promises = [];
      promises.push(offering.get('instructorGroups').then(instructorGroups => {
        let removableInstructorGroups = instructorGroups.filter(group => !this.get('buffer.instructorGroups').contains(group));
        instructorGroups.clear();
        removableInstructorGroups.forEach(group => {
          group.get('offerings').removeObject(offering);
        });
        this.get('buffer.instructorGroups').forEach(group => {
          group.get('offerings').pushObject(offering);
          instructorGroups.pushObject(group);
        });
      }));
      promises.push(offering.get('instructors').then(instructors => {
        let removableInstructors = instructors.filter(user => !this.get('buffer.instructors').contains(user));
        instructors.clear();
        removableInstructors.forEach(user => {
          user.get('offerings').removeObject(offering);
        });
        this.get('buffer.instructors').forEach(user => {
          user.get('offerings').pushObject(offering);
          instructors.pushObject(user);
        });
      }));
      promises.push(offering.get('learnerGroups').then(learnerGroups => {
        let removeableLearnerGroups = learnerGroups.filter(group => !this.get('buffer.learnerGroups').contains(group));
        learnerGroups.clear();
        removeableLearnerGroups.forEach(group => {
          group.get('offerings').removeObject(offering);
        });
        this.get('buffer.learnerGroups').forEach(group => {
          group.get('offerings').pushObject(offering);
          learnerGroups.pushObject(group);
        });
      }));
      let startDate = moment(this.get('buffer.startDate'));
      let endDate;
      if(this.get('buffer.isMultiDay')){
        endDate = moment(this.get('buffer.endDate'));
      } else {
        endDate = startDate.clone();
        let endTime = moment(this.get('buffer.endDate'));
        endDate.hour(endTime.format('HH'));
        endDate.minute(endTime.format('mm'));
      }

      offering.set('room', this.get('buffer.room'));
      offering.set('startDate', startDate.toDate());
      offering.set('endDate', endDate.toDate());
      promises.pushObject(offering.save());
      Ember.RSVP.all(promises).then(() => {
        if(!this.get('isDestroyed')){
          this.set('isEditing', false);
          this.set('buffer', null);
          this.sendAction('save', offering);
        }
      });
    },
    edit: function(){
      let offering = this.get('offering');
      if(offering){
        let buffer = Ember.Object.create({
          startDate: moment(offering.get('startDate')).toDate(),
          endDate: moment(offering.get('endDate')).toDate(),
          room: offering.get('room'),
          isMultiDay: offering.get('isMultiDay')
        });

        let collections = [
          'instructors',
          'instructorGroups',
          'learnerGroups'
        ];
        let promises = collections.map(collection => {
          return offering.get(collection).then(values => {
            let arr = [];
            arr.pushObjects(values.toArray());
            buffer.set(collection, arr);
          });
        });
        Ember.RSVP.all(promises).then(() => {
          this.set('buffer', buffer);
          this.set('isEditing', true);
        });
      }
    },
    cancel: function(){
      this.set('buffer', null);
      this.set('isEditing', false);
    },
    addInstructorGroupToBuffer(instructorGroup){
      this.get('buffer.instructorGroups').pushObject(instructorGroup);
    },
    addInstructorToBuffer(instructor){
      this.get('buffer.instructors').pushObject(instructor);
    },
    removeInstructorGroupFromBuffer(instructorGroup){
      this.get('buffer.instructorGroups').removeObject(instructorGroup);
    },
    removeInstructorFromBuffer(instructor){
      this.get('buffer.instructors').removeObject(instructor);
    },
    toggleMultiDay: function(){
      this.set('buffer.isMultiDay', !this.get('buffer.isMultiDay'));
    },
    remove: function(){
      this.sendAction('remove', this.get('offering'));
    },
    cancelRemove: function(){
      this.set('showRemoveConfirmation', false);
    },
    confirmRemove: function(){
      this.set('showRemoveConfirmation', true);
    },
    changeEndTime(date){
      let newEnd = moment(date);
      let endDate = moment(this.get('buffer.endDate'));
      endDate.hour(newEnd.format('HH'));
      endDate.minute(newEnd.format('mm'));
      this.set('buffer.endDate', endDate.toDate());
    },
    changeStartTime(date){
      let newStart = moment(date);
      let startDate = moment(this.get('buffer.startDate'));
      startDate.hour(newStart.format('HH'));
      startDate.minute(newStart.format('mm'));
      this.set('buffer.startDate', startDate.toDate());
    },

    addLearnerGroup(group) {
      let learnerGroups = this.get('learnerGroups');

      group.get('allDescendants').then((descendants) => {
        if (isEmpty(descendants)) {
          learnerGroups.addObject(group);
        } else {
          learnerGroups.addObjects(descendants);
        }
      });
    },

    removeLearnerGroup(group) {
      this.get('learnerGroups').removeObject(group);
    },
  }
});
