/* global moment */
import DS from 'ember-data';
import Ember from 'ember';

var Course = DS.Model.extend({
    title: DS.attr('string'),
    startDate: DS.attr('date'),
    endDate: DS.attr('date'),
    level: DS.attr('number'),
    year: DS.attr('number'),
    externalId: DS.attr('string'),
    deleted: DS.attr('boolean'),
    locked: DS.attr('boolean'),
    archived: DS.attr('boolean'),
    publishedAsTbd: DS.attr('boolean'),
    sessions: DS.hasMany('session', {async: true}),
    owningSchool: DS.belongsTo('school', {async: true}),
    isPublished: Ember.computed.notEmpty('publishEvent.content'),
    isNotPublished: Ember.computed.not('isPublished'),
    status: function(){
      if(this.get('publishEvent') != null){
        return Ember.I18n.t('general.published');
      } else {
        return Ember.I18n.t('general.notPublished');
      }
    }.property('publishEvent'),
    publishEvent: DS.belongsTo('publish-event', {async: true}),
    directors: DS.hasMany('user', {async: true}),
    cohorts: DS.hasMany('cohort', {async: true}),
    disciplines: DS.hasMany('discipline', {async: true}),
    objectives: DS.hasMany('objective', {async: true}),
    meshDescriptors: DS.hasMany('mesh-descriptor', {async: true}),
    learningMaterials: DS.hasMany('course-learning-material', {async: true}),
    academicYear: function(){
      return this.get('year') + ' - ' + (parseInt(this.get('year')) + 1);
    }.property('year'),
    competencies: [],
    watchObjectives: function(){
      var self = this;
      this.get('objectives').then(function(objectives){
        if(objectives.length){
          var promises = {};
          objectives.forEach(function(objective){
            promises[objective.get('id')] = objective.get('treeCompetencies');
          });
          Ember.RSVP.hash(promises).then(function(hash){
            var competencies = Ember.A();
            Object.keys(hash).forEach(function(key) {
              hash[key].forEach(function(competency){
                if(competency){
                  competencies.pushObject(competency);
                }
              });
            });
            self.set('competencies', competencies.uniq());
          });
        }
      });
    }.observes('objectives.@each').on('init'),
    publishedSessions: Ember.computed.filterBy('sessions', 'isPublished'),
    publishedSessionOfferingCounts: Ember.computed.mapBy('publishedSessions', 'offerings.length'),
    publishedOfferingCount: Ember.computed.sum('publishedSessionOfferingCounts'),
    setDatesBasedOnYear: function(){
      var today = moment();
      var firstDayOfYear = moment(this.get('year') + '-7-1', "YYYY-MM-DD");
      var startDate = today < firstDayOfYear?firstDayOfYear:today;
      var endDate = moment(startDate).add('8', 'weeks');
      this.set('startDate', startDate.toDate());
      this.set('endDate', endDate.toDate());
    },
    allPublicationIssuesCollection: Ember.computed.collect('requiredPublicationIssues.length', 'optionalPublicationIssues.length'),
    allPublicationIssuesLength: Ember.computed.sum('allPublicationIssuesCollection'),
    requiredPublicationIssues: function(){
      var self = this;
      var issues = [];
      var requiredSet = [
        'startDate',
        'endDate',
      ];
      var requiredLength = [
        'cohorts',
      ];
      requiredSet.forEach(function(val){
        if(!self.get(val)){
          issues.push(val);
        }
      });

      requiredLength.forEach(function(val){
        if(self.get(val + '.length') === 0){
          issues.push(val);
        }
      });

      return issues;
    }.property(
      'startDate',
      'endDate',
      'cohorts.length'
    ),
    optionalPublicationIssues: function(){
      var self = this;
      var issues = [];
      var requiredLength = [
        'disciplines',
        'objectives',
        'meshDescriptors',
      ];

      requiredLength.forEach(function(val){
        if(self.get(val + '.length') === 0){
          issues.push(val);
        }
      });

      return issues;
    }.property(
      'topics.length',
      'objectives.length',
      'meshDescriptors.length'
    )
});

export default Course;
