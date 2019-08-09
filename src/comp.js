import _ from 'lodash';

import Val from './val';
import Prim from './prim';
import v from './v';

const NullVal = new Prim(null);

export default class Comp extends Val {
  static valFrom(...args) {
    const origin = args.pop();
    const hsrc = args.pop() || null;
    const head = !hsrc || hsrc instanceof Val ? hsrc : new Prim(hsrc);
    const type = typeof(origin);

    if (!head && origin instanceof Val) {
      return origin;
    }

    if (head === null &&
        (type === "number" ||
         type === "string" ||
         type === "boolean" ||
         origin === null)) {
      return new Prim(origin);
    }

    if (head || origin) {
      let orgn;
      if (Array.isArray(origin)) {
        orgn = origin.map(val => val instanceof Prim ? val.origin : val);
        return new CompArray(orgn, head);
      } else if (type === "object" && origin && origin.constructor === Object) {
        orgn = {};
        for (const key of Object.keys(origin)) {
          const val = origin[key];
          orgn[key] = val instanceof Prim ? val.origin : val;
        }
        return new CompMap(orgn, head);
      } else if (type === "object" && origin && origin.constructor === Date) {
        return new CompDate(origin, head);
      }
      return new Comp(origin, head);
    }

    throw `not supported origin: ${origin}`;
  }


  constructor(origin, head) {
    super(origin);
    this.head = head || NullVal;
  }

  stringify(_indent=0) {
    const head = !this.head.equals(NullVal) ? this.head.stringify() + " " : "";
    return head + Val.stringify(this.origin, _indent);
  }

  get reducible() {
    return false;
  }

  get field() {
    return Comp.valFrom(this.origin);
  }

  getCompProp(key) {
    const kstr = this.convertKeyString(key);
    if (this.origin !== null && this.origin.hasOwnProperty(kstr)) {
      return this.constructor.valFrom(this.origin[kstr]);
    }

    return undefined;
  }

  getOwnProp(k) {
    const prop = this.getCompProp(k);
    if (prop) {
      return prop;
    }

    return super.getOwnProp(k);
  }

  get(k, store) {
    const key = v(k);

    if (store) {
      const pth = store.path(this, key);
      if (pth.isInner()) {
        return store.fetch(pth) || pth;
      }
    }

    let ownProp = this.getOwnProp(key);
    if (ownProp) {
      const base = this.getOwnProp("_id");
      if (store && base && ownProp instanceof CompMap) {
        const _id = store.path(base, key).keyString();
        return ownProp.patch({_id});
      }
      return ownProp;
    }

    const kstr = this.convertKeyString(key);
    if (kstr === "head") {
      return this.head;
    }

    return super.get(key, store);
  }

  patch(diff) {
    let d = Comp.valFrom(diff).origin;

    const remove = obj => {
      for (const k of Object.keys(obj)) {
        const prop = obj[k];
        if (prop === null || (prop.equals && prop.equals(Comp.valFrom(null)))) {
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

  sameType(val) {
    return (
      val.constructor === this.constructor
      && val.head.equals(this.head)
    );
  }

  collate(target) {
    if (!this.sameType(target)) {
      return super.collate(target);
    }

    return this.origin.collate(Comp.valFrom(target.origin));
  }

  object(store) {
    const o = super.object(store);
    if (!this.head.equals(NullVal)) {
      o._head = this.head.object(store);
    }
    return o;
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

  collate(target) {
    if (!this.sameType(target) || this.origin.length !== this.origin.length) {
      return super.collate(target);
    }

    const result = {};
    let i = 0;
    for (const pat of this.origin) {
      const m = pat.collate(Comp.valFrom(target.origin[i]));
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

  collate(target) {
    if (!this.sameType(target)) {
      return super.collate(target);
    }

    const result = {};
    for (const key of Object.keys(this.origin)) {
      const pat = this.origin[key];
      const m = pat.collate(Comp.valFrom(target.origin[key]));
      Object.assign(result, m.result);
    }
    return { pattern: this, target, result };
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
