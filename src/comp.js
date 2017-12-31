import _ from 'underscore';
import Val from './val';
import Prim from './prim';
import Hash from './hash';
import { sym } from './sym';

export default class Comp extends Val {
  static valFrom(...args) {
    const origin = args.pop();

    if (origin instanceof Val) {
      return origin;
    }

    const hsrc = args.pop();
    const head = hsrc instanceof Val ? hsrc : sym(hsrc);
    const type = typeof(origin);

    if (head === undefined &&
        (type === "number" ||
         type === "string" ||
         type === "boolean" ||
         origin === null)) {
      return new Prim(origin);
    }

    if (Array.isArray(origin) ||
        (type === "object" &&
         (origin.constructor === Object ||
          origin.constructor === Date))) { // todo:DateはJSではなくLay側の型・クラスに変更したい
      return new Comp(origin, head);
    }

    throw `not supported origin: ${origin}`;
  }

  constructor(origin, head=undefined) {
    super(origin);
    this.head = head ? head : Comp.valFrom(null);
  }

  get hash() {
    return new Hash(this.origin);
  }

  get id() {
    return this.hash;
  }

  get reducible() {
    return false;
  }

  get fields() {
    return this.origin;
  }

  get(key, book) {
    const o = this.origin[key];
    if (o) {
      return this.constructor.valFrom(o);
    } else {
      const proto = this.head.reduce(book);
      return proto ? proto.get(key) : Comp.valFrom(proto);
    }
  }

  set(key, val) {
    const o = _.clone(this.origin);
    o[key] = val.origin;
    return this.constructor.valFrom(o);
  }

  merge(diff) {
    const o = Object.assign({}, this.origin, diff);
    return this.constructor(o, this.head);
  }

  collate(val) {
    if (val.constructor !== this.constructor ||
        !val.head.equals(this.head)) {
      return super.collate(val);
    }

    if (Array.isArray(val.fields) && val.fields.length === this.fields.length) {
      const result = {};
      let i = 0;
      for (const pat of this.fields) {
        const m = pat.collate(Comp.valFrom(val.fields[i]));
        Object.assign(result, m);
        i++;
      }
      Object.assign(result, {it: val});
      return result;
    }

    { // Object fields
      const result = {};
      for (const key of Object.keys(this.fields)) {
        const pat = this.fields[key];
        const m = pat.collate(Comp.valFrom(val.fields[key]));
        Object.assign(result, m);
      }
      Object.assign(result, {it: val});
      return result;
    }
  }
}