import test from 'ava';
const Romi = require('./index');

test.cb((t) => {
  t.plan(5);
  Romi.resolve('a').then((res) => {
    t.is(res, 'a');
    return Romi.reject('b');
  }).catch((rea) => {
    t.is(rea, 'b');
    return 'c';
  }).then((res) => {
    t.is(res, 'c');
    throw 'd';
  }).then(() => {
    t.end();
  }).catch((rea) => {
    t.is(rea, 'd');
    return Romi.resolve('e');
  }).then((res) => {
    t.is(res, 'e');
    t.end();
  });
});
