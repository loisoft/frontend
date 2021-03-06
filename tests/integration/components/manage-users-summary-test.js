import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';
import setupRouter from '../../helpers/setup-router';
import wait from 'ember-test-helpers/wait';

moduleForComponent('manage-users-summary', 'Integration | Component | manage users summary', {
  integration: true,
  setup(){
    setupRouter(this);
  }
});

test('it renders', function(assert) {
  this.render(hbs`{{manage-users-summary}}`);

  assert.equal(this.$('h2').text().trim(), 'Ilios Users (View All)');
  assert.equal(this.$('a:eq(0)').text().trim(), 'View All');
  assert.notEqual(this.$('a:eq(0)').prop('href').search(/\/users$/), -1, `${this.$('a:eq(0)').prop('href')} links to /users`);
  assert.equal(this.$('a:eq(1)').text().trim(), 'Create New User');
  assert.notEqual(this.$('a:eq(1)').prop('href').search(/\/users\?addUser=true$/), -1, `${this.$('a:eq(1)').prop('href')} links to /users?addUser=true`);
  assert.equal(this.$('a:eq(2)').text().trim(), 'Upload Multiple Users');
  assert.notEqual(this.$('a:eq(2)').prop('href').search(/\/users\?addUsers=true$/), -1, `${this.$('a:eq(2)').prop('href')} links to /users?addUsers=true`);
});

test('show more input prompt', function(assert) {
  this.render(hbs`{{manage-users-summary}}`);

  const userSearch = '.user-search input';
  const results = '.user-search .results li';

  this.$(userSearch).val('12');
  this.$(userSearch).trigger('keyup');

  return wait().then(()=>{
    assert.equal(this.$(results).length, 1);
    assert.equal(this.$(results).text().trim(), 'keep typing...');
  });
});
