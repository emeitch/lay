import assert from 'assert';

import UUID from '../src/uuid';
import Store from '../src/store';
import Entity from '../src/entity';
import { transaction, transactionTime } from '../src/ontology';

describe("Store", () => {
  const id = new UUID();
  const rel = new UUID();
  const val = new UUID();
  
  let store;
  beforeEach(() => {
    store = new Store();
  });
    
  describe("#add", () => {
    context("standard arguments", () => {
      let p;
      beforeEach(() => {
        p = store.add(id, rel, val);
      });
      
      it("should add a proposition", () => {
        assert(p.id == id);
        assert(p.rel == rel);
        assert(p.val == val);
        assert(p.location == undefined);
        assert(p.hash.match(/^urn:sha256:.*$/));
        assert(store.get(p.hash) == p);
      });
      
      it("should append a transaction data", () => {
        const tps = store.transactionPropositions(p);
        assert(tps.length == 1);
        
        const t = store.transaction(p);
        assert(t.get(transactionTime).constructor == Date);
      });
    });
    
    context("with location", () => {
      const loc = new UUID();

      let p;
      beforeEach(() => {
        p = store.add(id, rel, val, loc);
      });

      it("shold add a proposition with location", () => {
        assert(p.id == id);
        assert(p.rel == rel);
        assert(p.val == val);
        assert(p.location == loc);
        assert(store.get(p.hash) == p);
      });
    });
  });
  
  describe("#ref", () => {
    context("key assigned", () => {
      beforeEach(() => {
        store.assign("i", id);
        store.assign("r", rel);
        store.assign("v", val);
      });
      
      it("should return a id by key", () => {
        assert(store.ref("i") == id);
        assert(store.ref("r") == rel);
        assert(store.ref("v") == val);
      });

      context("key re-assigned", () => {
        const rel2 = new UUID();

        beforeEach(() => {
          store.assign("r", rel2);
        });
        
        it("should return a re-assigned id by key", () => {
          assert(store.ref("r") == rel2);
        });
      });
    });
  });
  
  describe("#entity", () => {
    beforeEach(() => {
      store.add(id, rel, val);
    });
    
    it("should return a entity", () => {
      const e = store.entity(id);
      assert(e.constructor == Entity);
    });
  });
});
