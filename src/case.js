import { sym } from './sym';
import Val from './val';
import Native, { native } from './native';

class CaseAlt {
  constructor(...args) {
    const pats = args.slice(0, -1);
    this.pats = pats.map(p => typeof(p) === "string" ? sym(p) : p);
    this.grds = this.parseGuards(args[args.length-1]);
  }

  parseGuards(grds) {
    if (grds instanceof Function) {
      if(grds.length > 0 && grds.length != this.pats.length) {
        throw "arity mismatched for native function";
      }
      grds = native(grds);
    }

    if (!Array.isArray(grds)) {
      grds = [grds];
    }

    return grds;
  }

  _replace(book, sym, val, pats) {
    const grds = this.grds.map(grd => {
      if (grd instanceof Native) {
        const i = this.pats.map(p => p.origin).indexOf(sym.origin);
        return grd.bind(i, val);
      } else {
        return grd.replace(book, sym, val);
      }
    });

    return new this.constructor(...pats.concat([grds]));
  }

  replaceWithPats(book, sym, val) {
    const pats = this.pats.filter(pat => !sym.equals(pat));
    return this._replace(book, sym, val, pats);
  }

  replace(book, sym, val) {
    if (this.pats.some(pat => sym.equals(pat))) {
      return this;
    }
    return this._replace(book, sym, val, this.pats);
  }
}
export function alt(...args) {
  return new CaseAlt(...args);
}

class CaseGrd {
  constructor(cond, exp) {
    this.cond = cond;
    this.exp = typeof(exp) === "string" ? sym(exp) : exp;
  }

  replace(book, sym, val) {
    return new this.constructor(
      this.cond.replace(book, sym, val),
      this.exp.replace(book, sym, val)
    );
  }
}
export function grd(cond, exp) {
  return new CaseGrd(cond, exp);
}

export const otherwise = new Val(true);

export default class Case extends Val {
  static func(...args) {
    return new this(alt(...args));
  }

  constructor(...alts) {
    super();
    this.alts = alts;
  }

  replaceWithPats(book, sym, val) {
    const alts = this.alts.map(alt => alt.replaceWithPats(book, sym, val));
    return new this.constructor(...alts);
  }

  replace(book, sym, val) {
    const alts = this.alts.map(alt => alt.replace(book, sym, val));
    return new this.constructor(...alts);
  }

  apply(book, ...args) {
    for (const alt of this.alts) {
      const matches = args.map((v, i) => v.match(alt.pats[i]));
      if (matches.every(v => v !== undefined)) {
        const kase = matches.reduce(
          (cs, match) => Object.keys(match).reduce(
            (c, key) => c.replaceWithPats(book, sym(key), match[key]),
            cs),
          new this.constructor(alt));

        if (args.length < alt.pats.length) {
          return kase;
        }

        for (const grd of kase.alts[0].grds) {
          if (!grd.cond || grd.cond.reduce(book).origin) {
            return grd.exp ? grd.exp : grd;
          }
        }
      }
    }

    throw "matched pattern not found";
  }
}

export function kase(...args) {
    return new Case(...args);
}

export function kfunc(...args) {
  return Case.func(...args);
}
