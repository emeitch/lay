import assert from 'assert';

import UUID from '../src/uuid';
import Store from '../src/store';
import Obj from '../src/obj';
import { invalidate } from '../src/ontology';

describe("Obj", () => {
  const id = new UUID();
  const key = new UUID();

  let store;
  let obj;
  beforeEach(() => {
    store = new Store();
    obj = store.obj(id);
  });

  describe("#get", () => {
    context("without logs", () => {
      it("should return undefined", () => {
        assert.deepStrictEqual(obj.get(key), undefined);
      });
    });

    context("with UUID val log", () => {
      const dst = new UUID();

      beforeEach(() => {
        store.log(id, key, dst);
      });
      
      it("should return a obj of log's val", () => {
        assert.deepStrictEqual(obj.get(key), store.obj(dst));
      });
    });
    
    context("with value val log", () => {
      beforeEach(() => {
        store.log(id, key, "value");
      });
      
      it("should return a value", () => {
        assert.deepStrictEqual(obj.get(key), "value");
      });
    });
    
    context("with the same key but different vals log", () => {
      beforeEach(() => {
        store.log(id, key, "ver1");
        store.log(id, key, "ver2");
      });
      
      it("should return the last val as updating the property", () => {
        assert.deepStrictEqual(obj.get(key), "ver2");
      });
    });
    
    context("with invalidated log", () => {
      beforeEach(() => {
        const log = store.log(id, key, "value1");
        store.log(log.hash, invalidate);
      });

      it("should return undefined", () => {
        assert.deepStrictEqual(obj.get(key), undefined);
      });
      
      context("add other positive log", () => {
        beforeEach(() => {
          store.log(id, key, "value2");
        });
        
        it("should return the val", () => {
          assert.deepStrictEqual(obj.get(key), "value2");
        });
      });
      
      context("add same positive log", () => {
        beforeEach(() => {
          store.log(id, key, "value1");
        });
        
        it("should return the val", () => {
          assert.deepStrictEqual(obj.get(key), "value1");
        });
      });
    });
  });
});