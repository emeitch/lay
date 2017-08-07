import Exp from './exp';
import Box from './box';
import Env from './env';

class CaseAlt {
  constructor(pat, ...grds) {
    this.pat = pat;
    this.grds = grds;
  }
}
export function alt(pat, ...grds) {
  return new CaseAlt(pat, ...grds);
}

class CaseGrd {
  constructor(cond, exp) {
    this.cond = cond;
    this.exp = exp;
  }
}
export function grd(cond, exp) {
  return new CaseGrd(cond, exp);
}

export default class Case extends Exp {
  constructor(exp, ...alts) {
    super();
    this.exp = exp;
    this.alts = alts;
  }

  reduce(env=new Box()) {
    const val = this.exp.reduce(env);
    for (const alt of this.alts) {
      const bindings = val.match(alt.pat);
      if (bindings) {
        const e = new Env(env, undefined, bindings);
        for (const grd of alt.grds) {
          if (grd instanceof CaseGrd) {
            if (grd.cond.reduce(e).origin) {
              return grd.exp.reduce(e);
            }
          } else {
            const exp = grd;
            return exp.reduce(e);
          }
        }
      }
    }

    throw "matched pattern not found";
  }
}
