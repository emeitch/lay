import Ref from './ref';
import Val from './val';
import Case from './case';
import v from './v';
import { sym } from './sym';
import { exp } from './exp';
import { func, LiftedNative } from './func';

export default class Path extends Ref {
  constructor(...ids) {
    ids = ids.map((id, index) => {
      if (typeof(id) === "string") {
        return index === 0 ? sym(id) : v(id);
      } else if (Array.isArray(id)) {
        return id.map(i => {
          if (typeof(i) === "string") {
            return index === 0 ? sym(i) : v(i);
          } else {
            return i;
          }
        });
      } else {
        return id;
      }
    });
    super(ids);
  }

  get receiver() {
    const [receiver,] = this.origin;
    return receiver;
  }

  get keys() {
    const [, ...keys] = this.origin;
    return keys;
  }

  stringify(indent=0) {
    return "Path " + Val.stringify(this.origin, indent);
  }

  replace(matches) {
    return new this.constructor(...this.origin.map(id => Array.isArray(id) ? id.map(i => i.replace(matches)) : id.replace(matches)));
  }

  step(store) {
    let obj;
    if (Array.isArray(this.receiver)) {
      obj = exp(...this.receiver).reduce(store);
    } else {
      obj = this.receiver.reduce(store);
    }

    // todo: sym対応でresolveとreduce/stepが入り混じっていて醜いのを修正
    // todo: _target用の1回分特殊処理になっているので除去すべき!!
    obj = store.resolve(obj);
    if (!obj) {
      return super.step(store);
    }
    obj = obj.reduce(store);

    for (const elm of this.keys) {
      // todo: sym対応でresolveとreduce/stepが入り混じっていて醜いのを修正
      obj = store.resolve(obj);
      if (!obj) {
        return super.step(store);
      }

      let key;
      let args = [];
      if (Array.isArray(elm)) {
        const [top, ...rest] = elm;
        key = top;
        args = rest;
      } else {
        key = elm;
      }

      let prop = obj.get(key, store);
      if (prop instanceof Function) {
        // LiftedNativeの基本仕様はthisでstoreを渡すだが
        // 組み込みのメソッドの場合、thisで自身を参照したいケースが大半で
        // storeを渡すわけにいかないので、自身の値をbindする
        const f = prop.bind(obj);
        const nf = (...args) => {
          const as = args.map(a => a.reduce(store));
          if (as.some(a => a.reducible)) {
            return exp(new LiftedNative(nf), ...as);
          }

          return f(...as);
        };
        prop = func(new LiftedNative(nf));
      }
      if (prop === undefined) {
        return super.step(store);
      }

      if (prop instanceof Case) {
        const c = prop.replaceSelfBy(obj);
        const as = args.map(a => a.replaceSelfBy(obj));
        const e = exp(c, ...as);
        obj = e.reduce(store).replaceSelfBy(obj);
      } else {
        const replaced = prop.replaceSelfBy(obj);
        obj = replaced.reduce(store);
      }
    }

    // todo: sym対応でresolveとreduce/stepが入り混じっていて醜いのを修正
    const base = obj;
    obj = store.resolve(base);
    return obj ? obj : base;
  }

  object(_store) {
    const base = super.object(_store);
    return Object.assign({}, base, {
      origin: this.origin.map(o => {
        if (Array.isArray(o)) {
          return o.map(i => i.object(_store));
        } else {
          return o.object(_store);
        }
      })
    });
  }
}

export function path(...args) {
  return new Path(...args);
}
