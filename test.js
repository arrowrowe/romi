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

test('Support multiple followers', (t) => {
  t.plan(4);
  const responses = [
    'some-response',
    'another-response',
    'yet-another-response',
    'one-more-response'
  ];
  const r = Romi.resolve(responses[0]);
  return Romi.all([
    r.then((res) => {
      t.is(res, responses[0]);
      return responses[1];
    }).then((res) => {
      t.is(res, responses[1]);
      return responses[2];
    }),
    r.then((res) => {
      t.is(res, responses[0]);
      return responses[3];
    })
  ]).then((res) => {
    t.same(res, [
      responses[2],
      responses[3]
    ]);
  });
});

test.cb('Cancelable', (t) => {
  const a = Romi.resolve('Fail to cancel', 1);
  a.then(t.fail.bind(t));
  a.cancel();
  setTimeout(t.end, 2);
});

test('Promise that all promises will resolve', (t) => Romi.all([
  Romi.all([
    Romi.resolve('a', 2),
    Romi.resolve('b', 1),
    Romi.resolve('c', 3)
  ]).then((res) => {
    t.same(res, ['a', 'b', 'c']);
  }),
  Romi.all([
    Romi.reject('a', 3),
    Romi.resolve('b', 1),
    Romi.reject('c', 2)
  ]).then(t.fail.bind(t), (rea) => {
    t.is(rea, 'c');
  })
]));

test('Promise that only one promise will the race', (t) => Romi.all([
  Romi.race([
    Romi.resolve('a', 2),
    Romi.resolve('b', 1),
    Romi.resolve('c', 3)
  ]).then((res) => {
    t.is(res, 'b');
  }),
  Romi.race([
    Romi.reject('a', 3),
    Romi.reject('b', 1),
    Romi.reject('c', 2)
  ]).then(t.fail.bind(t), (rea) => {
    t.is(rea, 'b');
  })
]));
