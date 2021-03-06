import Ember from 'ember';

const { isEmpty, isArray, Helper, observer } = Ember;

export function intersectionCount([a, b]/*, hash*/) {
  if (! isArray(a) || ! isArray(b) || isEmpty(a) || isEmpty(b)) {
    return 0;
  }

  if (a.length > b.length) {
    let tmp = a;
    a = b;
    b = tmp;
  }

  let count = 0;
  a.forEach((item) => {
    if (b.includes(item)) {
      count++;
    }
  });

  return count;
}

export default Helper.extend({
  a: [],
  b: [],

  compute([a, b]) {
    this.set('a', a);
    this.set('b', b);
    return intersectionCount([a, b]);
  },

  recomputeOnArrayChange: observer('a.[]', 'b.[]', function() {
    this.recompute();
  })
});
