import test from 'ava';
const Romi = require('./index');

test((t) => {
  t.plan(6);
  return Romi.resolve('a').then((res) => {
    t.is(res, 'a');
    return Romi.reject('b');
  }).catch((rea) => {
    t.is(rea, 'b');
    return 'c';
  }).then((res) => {
    t.is(res, 'c');
    throw 'd';
  }).then(() => {
    t.fail();
  }).catch((rea) => {
    t.is(rea, 'd');
    return Romi.resolve('e');
  }).then((res) => {
    t.is(res, 'e');
    return 'f';
  }).catch(() => {
    t.fail();
  }).then((res) => {
    t.is(res, 'f');
  });
});

test('Throw uncaught error', (t) => {
  t.plan(1);
  const r = new Romi();
  const errorMessage = 'some-error-message';
  t.throws(() => {
    r.reject(new Error(errorMessage));
  }, errorMessage);
});

test('Prevent completing already completed promises', (t) => {
  t.plan(1);
  const r = Romi.resolve('whatever');
  return r.then(() => {
    t.throws(() => {
      r.resolve('again');
    }, /already/);
  });
});

test.cb('Support multiple followers', (t) => {
  t.plan(3);
  let fullfilledCount = 0;
  const fullfill = () => ++fullfilledCount >= 2 && t.end();

  const someResponse = 'some-response';
  const anotherResponse = 'another-response';
  const r = Romi.resolve(someResponse);
  r.then((res) => {
    t.is(res, someResponse);
    return anotherResponse;
  }).then((res) => {
    t.is(res, anotherResponse);
    fullfill();
  });
  r.then((res) => {
    t.is(res, someResponse);
    fullfill();
  });
});
