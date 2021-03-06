import Val from './val';
import Prim from './prim';
import Obj from './obj';
import Arr from './arr';
import Time from './time';

export default function v(...args) {
  const origin = args.pop();
  const protoSrc = args.pop() || null;
  const jstype = typeof(origin);

  if (origin instanceof Val) {
    return origin;
  }

  if (jstype === "number"
      || jstype === "string"
      || jstype === "boolean"
      || origin === null) {
    return new Prim(origin);
  }

  if (origin) {
    if (Array.isArray(origin)) {
      const orgn = origin.map(val => val instanceof Prim ? val.origin : val);
      return new Arr(orgn);
    } else if (jstype === "object" && origin && origin.constructor === Date) {
      return new Time(origin);
    }

    const protoName = !protoSrc || !(protoSrc instanceof Val) ? protoSrc : protoSrc.origin;
    const orgn = {};
    for (const key of Object.keys(origin)) {
      const val = origin[key];
      orgn[key] = val instanceof Prim ? val.origin : val;
    }
    return new Obj(orgn, protoName);
  }

  throw `not supported origin: ${origin}`;
}
