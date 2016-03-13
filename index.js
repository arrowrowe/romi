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

Romi.resolve = (val, ms) => ms > 0 ?
  new Romi((resolve) => setTimeout(() => resolve(val), ms)) :
  new Romi((resolve) => resolve(val));
Romi.reject = (val, ms) => new Romi((resolve, reject) => setTimeout(() => reject(val), ms || 1));
Romi.complete = Romi.then = Romi.catch = Romi.cacel = () => {
  throw new Error('Should call on a Romi instance, not Romi itself.');
};

const romiWithOn = (onResolve, onReject) => {
  const r = new Romi();
  r._on = {
    resolve: onResolve || ((val) => val),
    reject: onReject || ((val) => {
      throw val;
    })
  };
  return r;
};

Romi.prototype.then = function (onResolve, onReject) {
  const r = romiWithOn(onResolve, onReject);
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

const duplicate = (src, dest) => {
  if (src._followers) {
    src._followers = dest._followers;
  } else {
    dest.complete(src._which, src._val);
  }
};

Romi.prototype.complete = function (whichOrigin, valOrigin) {
  this.complete = this.resolve = this.reject = (which, val) => {
    throw new Error('Promise already completed. [' + which + '][' + val + ']');
  };
  this._which = whichOrigin;
  this._val = valOrigin;
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
      duplicate(val, r);
    } else {
      r[which](val);
    }
    return r;
  };
  this.then = (onResolve, onReject) => complete(romiWithOn(onResolve, onReject));
  this._followers.forEach(complete);
  delete this._followers;
};

Romi.prototype.cancel = function () {
  this.complete = this.resolve = this.reject = () => {};
  this.then = () => new Romi();
  delete this._followers;
};

const cancelAll = (rs) => rs.forEach((r) => r.cancel());

Romi.all = (rs) => new Romi((resolve, reject) => {
  rs.forEach((r, i) => {
    if (r instanceof Romi) {
      return;
    }
    rs[i] = Romi.resolve(r);
  });
  const count = rs.length;
  const responses = new Array(count);
  let fullfilledCount = 0;
  rs.forEach((r, i) => {
    r.then(
      (res) => {
        responses[i] = res;
        if (++fullfilledCount >= count) {
          resolve(responses);
        }
      },
      (rea) => {
        cancelAll(rs);
        reject(rea);
      }
    );
  });
});

Romi.race = (rs) => new Romi((resolve, reject) => {
  for (let i = 0; i < rs.length; i++) {
    if (rs[i] instanceof Romi) {
      continue;
    }
    resolve(rs[i]);
    return;
  }
  const complete = (fn, val) => {
    cancelAll(rs);
    fn(val);
  };
  rs.forEach((r) => {
    r.then(
      (res) => complete(resolve, res),
      (rea) => complete(reject, rea)
    );
  });
});
