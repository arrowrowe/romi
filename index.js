'use strict';

const Romi = module.exports = function (initializer) {
  this._followers = [];
  if (initializer) {
    initializer(
      (val) => this.resolve(val),
      (val) => this.reject(val)
    );
  }
};

Romi.resolve = (val, ms) => new Romi((resolve) => setTimeout(() => resolve(val), ms || 1));
Romi.reject = (val, ms) => new Romi((resolve, reject) => setTimeout(() => reject(val), ms || 1));
Romi.complete = (which, val, ms) => Romi[which](val, ms);
Romi.then = (onResolve, onReject) => {
  const r = new Romi();
  r._on = {
    resolve: onResolve || ((val) => val),
    reject: onReject || ((val) => {
      throw val;
    })
  };
  return r;
};
Romi.catch = (onReject) => Romi.then(null, onReject);

Romi.prototype.then = function (onResolve, onReject) {
  const r = Romi.then(onResolve, onReject);
  this._followers.push(r);
  return r;
};

Romi.prototype.catch = function (onReject) {
  return this.then(null, onReject);
};

Romi.prototype.resolve = function (val) {
  this.complete('resolve', val);
};

Romi.prototype.reject = function (val) {
  if (this._followers.length === 0) {
    throw val;
  }
  this.complete('reject', val);
};

Romi.prototype.complete = function (whichOrigin, valOrigin) {
  this.complete = this.resolve = this.reject = () => {
    throw new Error('Promise already completed.');
  };
  const complete = (r) => {
    let val;
    let which;
    try {
      val = r._on[whichOrigin](valOrigin);
      which = 'resolve';
    } catch (ex) {
      val = ex;
      which = 'reject';
    }
    if (val instanceof Romi) {
      val._followers = r._followers;
    } else {
      r[which](val);
    }
    return r;
  };
  this.then = (onResolve, onReject) => complete(Romi.then(onResolve, onReject));
  this._followers.forEach(complete);
  delete this._followers;
};

Romi.prototype.cancel = function () {
  this.complete = this.resolve = this.reject = () => {};
  delete this._followers;
};

const cancelAll = (rs) => rs.forEach((r) => typeof r.cancel === 'function' && r.cancel());

Romi.all = (rs) => new Romi((resolve, reject) => {
  const count = rs.length;
  const responses = new Array(count);
  let fullfilledCount = 0;
  const resolveOne = (res, i) => {
    responses[i] = res;
    if (++fullfilledCount >= count) {
      resolve(responses);
    }
  };
  rs.forEach((r, i) => {
    if (r instanceof Romi) {
      r.then(
        (res) => resolveOne(res, i),
        (rea) => {
          cancelAll(rs);
          reject(rea);
        }
      );
    } else {
      resolveOne(r, i);
    }
  });
});

Romi.race = (rs) => new Romi((resolve, reject) => {
  const complete = (fn, val) => {
    cancelAll(rs);
    fn(val);
  };
  rs.forEach((r) => {
    if (r instanceof Romi) {
      r.then(
        (res) => complete(resolve, res),
        (rea) => complete(reject, rea)
      );
    } else {
      complete(resolve, r);
    }
  });
});
