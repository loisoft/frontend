import { moduleForComponent } from 'ember-qunit';
import { skip } from 'qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('curriculum-inventory-sequence-block-overview', 'Integration | Component | curriculum inventory sequence block overview', {
  integration: true
});

skip('it renders', function(assert) {
  // Set any properties with this.set('myProperty', 'value');
  // Handle any actions with this.on('myAction', function(val) { ... });

  this.render(hbs`{{curriculum-inventory-sequence-block-overview}}`);

  assert.equal(this.$().text().trim(), '');

  // Template block usage:
  this.render(hbs`
    {{#curriculum-inventory-sequence-block-overview}}
      template block text
    {{/curriculum-inventory-sequence-block-overview}}
  `);

  assert.equal(this.$().text().trim(), 'template block text');
});
