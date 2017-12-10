import assert from 'assert';

import Prim from '../src/prim';
import Comp from '../src/comp';
import { sym } from '../src/sym';

import v from '../src/v';

describe("v function", () => {
  context("with primitive value origin", () => {
    it("should return a Prim", () => {
      assert.deepStrictEqual(v(0).constructor, Prim);
      assert.deepStrictEqual(v("foo").constructor, Prim);
      assert.deepStrictEqual(v(true).constructor, Prim);
      assert.deepStrictEqual(v(null).constructor, Prim);
    });
  });

  context("with complex value origin", () => {
    it("should return a Comp", () => {
      assert.deepStrictEqual(v({a: 1, b: 2}).constructor, Comp);
      assert.deepStrictEqual(v([1, 2, 3]).constructor, Comp);
      assert.deepStrictEqual(v(new Date()).constructor, Comp);
    });
  });

  context("with complex value and construcor", () => {
    it("should return a Comp", () => {
      const val = v("Foo", {a: 1, b: 2});
      assert.deepStrictEqual(val.constructor, Comp);
      assert.deepStrictEqual(val.head, sym("Foo"));
      assert.deepStrictEqual(val.origin, {a: 1, b: 2});
    });
  });

  context("with empty complex value as enum value", () => {
    it("should return a Sym", () => {
      const val = v("Foo", {});
      assert.deepStrictEqual(val, sym("Foo"));
      assert.deepStrictEqual(val.head, sym("Foo"));
      assert.deepStrictEqual(val.fields, null);
    });
  });

  context("with error value", () => {
    it("should throw error", () => {
      assert.throws(() => v(undefined), /not supported origin:/);
    });
  });
});
