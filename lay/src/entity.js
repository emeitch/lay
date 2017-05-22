import UUID from './uuid'
import { not } from '../src/ontology';

export default class Entity {
  constructor(store, id) {
    this.store = store;
    this.id = id;
  }
  
  get(rel) {
    const ps = this.store.where({subject: this.id, relation: rel});
    if (ps.length == 0) {
      return undefined;
    }
    
    const p = ps[ps.length-1];
    
    const nps = this.store.where({subject: p.id, relation: not});
    if (nps.length > 0) {
      return undefined;
    }
    
    const o = p.object;
    // todo: sha256をIDオブジェクト化したい
    if (o.constructor === UUID || typeof(o) === "string" && o.match(/^urn:sha256:/)) {
      return this.store.entity(ps[0].object);  
    } else {
      return o;
    }
  }
}