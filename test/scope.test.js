import assert from 'assert';

import UUID from '../src/uuid';
import Scope, { scope } from '../src/scope';

describe("Scope", () => {
  describe("scope func", () => {
    it("return scope val", () => {
      const id0 = new UUID();
      const id1 = new UUID();
      const id2 = new UUID();

      const s = scope(id0, id1, id2);

      assert.deepStrictEqual(s.constructor, Scope);
      assert.deepStrictEqual(s.origin[0], id0);
      assert.deepStrictEqual(s.origin[1], id1);
      assert.deepStrictEqual(s.origin[2], id2);
    });
  });

  describe("#get", () => {
    it("should return indexed id", () => {
      const id0 = new UUID();
      const id1 = new UUID();
      const id2 = new UUID();

      const s = scope(id0, id1, id2);
      const dummyBook = undefined;

      assert.deepStrictEqual(s.get(0, dummyBook), id0);
      assert.deepStrictEqual(s.get(1, dummyBook), id1);
      assert.deepStrictEqual(s.get(2, dummyBook), id2);
    });

    context("one id", () => {
      it("should return id as indexed 0", () => {
        const id0 = new UUID();

        const s = scope(id0);
        const dummyBook = undefined;

        assert.deepStrictEqual(s.constructor, Scope);
        assert.deepStrictEqual(s.origin[0], id0);
        assert.deepStrictEqual(s.get(0, dummyBook), id0);
      });
    });
  });
});