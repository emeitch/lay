import assert from 'assert';
import { prim } from '../src/prim';
import v from '../src/v';

describe("Prim", () => {
  context("primitive value", () => {
    describe("#id", () => {
      it("should return oneself", () => {
        assert.deepStrictEqual(prim(1).id, new prim(1));
        assert.deepStrictEqual(v(1).id, v(1));
        assert.deepStrictEqual(v("foo").id, v("foo"));
        assert.deepStrictEqual(v(true).id, v(true));
        assert.deepStrictEqual(v(null).id, v(null));
      });
    });

    describe("#reducible", () => {
      it("should return false", () => {
        assert.deepStrictEqual(v(1).reducible, false);
        assert.deepStrictEqual(v("foo").reducible, false);
        assert.deepStrictEqual(v(true).reducible, false);
        assert.deepStrictEqual(v(null).reducible, false);
      });
    });

    describe("#type", () => {
      it("should return type sym", () => {
        assert.deepStrictEqual(v(1).typeName, "Number");
        assert.deepStrictEqual(v("foo").typeName, "String");
        assert.deepStrictEqual(v(true).typeName, "Boolean");
        assert.deepStrictEqual(v(null).typeName, "Null");
      });
    });

    describe("#object", () => {
      assert.deepStrictEqual(v(1).object(), 1);
      assert.deepStrictEqual(v("foo").object(), "foo");
      assert.deepStrictEqual(v(true).object(), true);
      assert.deepStrictEqual(v(null).object(), null);
    });

    describe("#isUUID", () => {
      it("shoudl return false", () => {
        assert(!v(1).isUUID());
        assert(!v("foo").isUUID());
        assert(!v(true).isUUID());
        assert(!v(null).isUUID());

        assert(v("urn:uuid:foo-bar-buz").isUUID());
      });
    });
  });
});
