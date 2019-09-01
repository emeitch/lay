import _ from 'lodash';

import Val from './val';
import v from './v';

class Comp extends Val {
  stringify(_indent=0) {
    const type = this.getOwnProp("_type");
    const typestr = type.equals(v("Map")) ? "" : type.origin + " ";
    const originstr = Object.assign({}, this.origin);
    delete originstr._type;
    return typestr + Val.stringify(originstr, _indent);
  }

  get reducible() {
    return false;
  }
}

export class CompArray extends Comp {
  get typeName() {
     return "Array";
  }

  get jsObj() {
    return this.origin.map(val => {
      return val instanceof Val ? val.jsObj : val;
    });
  }

  getJSArrayItem(key) {
    const index = key.origin;
    if (typeof(index) !== "number") {
      return undefined;
    }

    const item = this.origin[index];
    return item ? v(item) : undefined;
  }

  getOwnProp(key) {
    return this.getJSArrayItem(key) || super.getOwnProp(key);
  }

  get(k, store) {
    const key = v(k);
    return this.getOwnProp(key) || super.get(key, store);
  }

  collate(target) {
    if (this.constructor !== target.constructor || this.origin.length !== target.origin.length) {
      return super.collate(target);
    }

    const result = {};
    let i = 0;
    for (const pat of this.origin) {
      const m = pat.collate(v(target.origin[i]));
      Object.assign(result, m.result);
      i++;
    }
    return { pattern: this, target, result };
  }

  object(store) {
    const o = super.object(store);
    o.origin = this.origin.map(o => o instanceof Val ? o.object(store) : o);
    return o;
  }
}

export class CompMap extends Comp {
  constructor(origin, type) {
    const o = Object.assign({}, origin, type ? {_type: type}: undefined);
    super(o);
  }

  get typeName() {
     return "Map";
  }

  get jsObj() {
    let ret = {};
    for (const key of Object.keys(this.origin)) {
      const val = this.origin[key];
      ret[key] = val instanceof Val ? val.jsObj : val;
    }
    return ret;
  }

  getJSObjectProperty(key) {
    const kstr = this.convertKeyString(key);
    const hasProp = Object.prototype.hasOwnProperty.call(this.origin, kstr);
    return hasProp ? v(this.origin[kstr]) : undefined;
  }

  getOwnProp(key) {
    return this.getJSObjectProperty(key) || super.getOwnProp(key);
  }

  get(k, store) {
    const key = v(k);

    if (store) {
      const pth = store.path(this, key);
      if (pth.isInner()) {
        return store.fetch(pth) || pth;
      }
    }

    const ownProp = this.getOwnProp(key);
    if (ownProp) {
      const base = this.getOwnProp("_id");
      if (store && base && ownProp instanceof CompMap) {
        const _id = store.path(base, key).keyString();
        return ownProp.patch({_id});
      }
      return ownProp;
    }

    return super.get(key, store);
  }

  collate(target) {
    if (this.constructor !== target.constructor) {
      return super.collate(target);
    }

    if (!this.getOwnProp("_type").equals(target.getOwnProp("_type"))) {
      return { pattern: this, result: null };
    }

    const result = {};
    for (const key of Object.keys(this.origin)) {
      if (key[0] === "_") {
        continue;
      }
      const pat = this.getOwnProp(key);
      const m = pat.collate(v(target.origin[key]));
      Object.assign(result, m.result);
    }
    return { pattern: this, target, result };
  }

  patch(diff) {
    let d = v(diff).origin;

    const remove = obj => {
      for (const k of Object.keys(obj)) {
        const prop = obj[k];
        if (prop === null || (prop.equals && prop.equals(v(null)))) {
          delete obj[k];
        }

        if (typeof(prop) === "object" && prop !== null && !(prop instanceof Val)) {
          remove(prop);
        }
      }
      return obj;
    };

    const oo = Object.assign({}, this.origin);
    const newObj = remove(_.merge(oo, d));
    return new this.constructor(newObj);
  }

  step(store) {
    const body = this.getOwnProp("_body");
    return body ? body.step(store) : super.step(store);
  }

  object(store) {
    const o = super.object(store);
    delete o.origin;

    for (const key of Object.keys(this.origin)) {
      const val = this.origin[key];
      o[key] = val instanceof Val ? val.object(store) : val;
    }

    return o;
  }

  keyString() {
    const id = this.get("_id");
    return id ? id.keyString() : super.keyString();
  }
}

export class CompDate extends Comp {
  get typeName() {
     return "Date";
  }

  object(store) {
    const o = super.object(store);
    return Object.assign(o, {
      origin: this.origin.toISOString()
    });
  }
}
