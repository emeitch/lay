import assert from 'assert';

import { v } from '../src/val';
import Path from '../src/path';
import UUID from '../src/uuid';
import { self } from '../src/self';
import Env from '../src/env';
import Store from '../src/store';

describe("Path", () => {
  describe("constructor ", () => {
    it("should accept self", () => {
      assert.doesNotThrow(() => new Path(self));
    });

    it("should require the receiver is typed ID or Self", () => {
      assert.throws(() => new Path("strobj"), / is not a ID or a Self/);
    });

    it("should require keys are typed ID", () => {
      assert.throws(() => new Path(new UUID(), "strobj"), / is not a ID$/);
    });
  });

  const id1 = new UUID();
  const id2 = new UUID();
  const id3 = new UUID();
  let p;
  beforeEach(() => {
    p = new Path(id1, id2, id3);
  });

  describe("#receiver", () => {
    it("should return the first id", () => {
      assert.deepStrictEqual(p.receiver, id1);
    });
  });

  describe("#keys", () => {
    it("should return rest ids", () => {
      assert.deepStrictEqual(p.keys, [id2, id3]);
    });
  });

  describe("#toString", () => {
    it("should return ids joined by slash", () => {
      assert.deepStrictEqual(p.toString(),`${id1}/${id2}/${id3}`);
    });
  });

  describe("#reduce", () => {
    let store;
    beforeEach(() => {
      store = new Store();
    });

    context("absolute path with uuid end", () => {
      const id = new UUID();
      const key = new UUID();
      const id2 = new UUID();
      const key2 = new UUID();
      const id3 = new UUID();
      beforeEach(() => {
        store.log(id, key, id2);
        store.log(id2, key2, id3);
        p = new Path(id, key, key2);
      });

      it("should return the val", () => {
        assert.deepStrictEqual(p.reduce(store), id3);
      });
    });

    context("relative path with uuid end", () => {
      const id = new UUID();
      const key = new UUID();
      const val = v("val0");
      let env;
      beforeEach(() => {
        store.log(id, key, val);
        env = new Env(store, id);
        p = new Path(self, key);
      });

      it("should return the val", () => {
        assert.deepStrictEqual(p.reduce(env), val);
      });
    });

    context("relative path chain", () => {
      const id = new UUID();
      const key = new UUID();
      const id2 = new UUID();
      const key2 = new UUID();
      const key3 = new UUID();
      const val3 = v("val0");
      let env;
      beforeEach(() => {
        store.log(id, key, id2);
        store.log(id2, key2, new Path(self, key3));
        store.log(id2, key3, val3);
        env = new Env(store, id);
        p = new Path(self, key, key2);
      });

      it("should return the val", () => {
        assert.deepStrictEqual(p.reduce(env), val3);
      });
    });

    context("unknown path", () => {
      const id = new UUID();
      const unknownKey1 = new UUID();
      const unknownKey2 = new UUID();
      beforeEach(() => {
        p = new Path(id, unknownKey1, unknownKey2);
      });

      it("should raise exception", () => {
        assert.deepStrictEqual(p.reduce(store), p);
      });
    });
  });
});