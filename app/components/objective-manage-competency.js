import Ember from 'ember';
import DS from 'ember-data';

const { Component, computed } = Ember;
const { notEmpty, oneWay } = computed;

export default Component.extend({
  objective: null,
  programYear: oneWay('objective.programYear'),
  showCompetencyList: notEmpty('programYear.competencies'),
  classNames: ['objective-manager', 'objective-manage-competency'],
  competencies: computed('programYear.competencies.[]', 'objective.competency', function(){
    if(!this.get('programYear')){
      return [];
    }

    return DS.PromiseArray.create({
      promise: this.get('programYear.competencies')
    });
  }),
  domains: computed('competencies.@each.domain', 'objective.competency', function(){
    var defer = Ember.RSVP.defer();
    var domainContainer = {};
    var domainIds = [];
    var promises = [];
    let domainProxy = Ember.ObjectProxy.extend({
      selectedCompetency: null,
      subCompetencies: [],
      selected: computed('subCompetencies.[]', 'selectedCompetency', function(){
        let selectedSubCompetencies = this.get('subCompetencies').filter(competencyProxy => {
          return competencyProxy.get('id') === this.get('selectedCompetency.id');
        });
        return selectedSubCompetencies.length > 0;
      }),
    });
    let competencyProxy = Ember.ObjectProxy.extend({
      selectedCompetency: null,
      selected: computed('content', 'selectedCompetency', function(){
        return this.get('content.id') === this.get('selectedCompetency.id');
      }),
    });
    this.get('competencies').forEach((competency) =>{
      promises.pushObject(competency.get('domain').then(
        domain => {
          if(!domainContainer.hasOwnProperty(domain.get('id'))){
            domainIds.pushObject(domain.get('id'));
            domainContainer[domain.get('id')] = domainProxy.create({
              content: domain,
              selectedCompetency: this.get('objective.competency'),
              subCompetencies: [],
            });
          }
          if(competency.get('id') !== domain.get('id')){
            var subCompetencies = domainContainer[domain.get('id')].get('subCompetencies');
            if(!subCompetencies.contains(competency)){
              subCompetencies.pushObject(competencyProxy.create({
                content: competency,
                selectedCompetency: this.get('objective.competency')
              }));
              subCompetencies.sortBy('title');
            }
          }
        }
      ));
    });
    Ember.RSVP.all(promises).then(function(){
      var domains = domainIds.map(function(id){
        return domainContainer[id];
      }).filter(
        domain => domain.get('subCompetencies').length > 0
      ).sortBy('title');
      defer.resolve(domains);
    });

    return DS.PromiseArray.create({
      promise: defer.promise
    });
  }),
  actions: {
    changeCompetency: function(competency){
      this.get('objective').set('competency', competency);
    },
    removeCurrentCompetency: function(){
      this.get('objective').set('competency', null);
    }
  }
});
