const Romi = module.exports = function (initializer) {
  this._followers = [];
  if (initializer) {
    initializer(
      (val) => this.resolve(val),
      (val) => this.reject(val)
    );
  }
};

Romi.resolve = (val) => new Romi((resolve) => setTimeout(() => resolve(val), 1));
Romi.reject = (val) => new Romi((resolve, reject) => setTimeout(() => reject(val), 1));
Romi.complete = (which, val) => Romi[which](val);
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

Romi.prototype.complete = function (which, val) {
  this.complete = this.resolve = this.reject = () => {
    throw new Error('Promise already completed.');
  };
  const complete = (r) => {
    try {
      val = r._on[which](val);
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
