import assert from 'assert';

import Val from '../src/val';
import v from '../src/v';

describe("Val", () => {
  context("number origin", () => {
    const Inherited = class ExtendedVal extends Val { get _prop() { return v(3); } };
    const val = new Inherited(0);

    describe("#origin", () => {
      it("should return original value", () => {
        assert.deepStrictEqual(val.origin, 0);
      });
    });

    describe("#protoName", () => {
      it("should return the proto name string", () => {
        assert.deepStrictEqual(val.protoName, "ExtendedVal");
      });
    });

    describe("#_toStr", () => {
      it("should return string prim", () => {
        assert.deepStrictEqual(val._toStr, v("0"));
      });
    });

    describe("#jsObj", () => {
      it("should return the origin", () => {
        assert.deepStrictEqual(val.jsObj, 0);
      });
    });

    describe("#get", () => {
      it("should return underscore prefix _key's val", () => {
        assert.deepStrictEqual(val.get("prop"), v(3));
        assert.deepStrictEqual(val.get(v("prop")), v(3));
      });

      context("not exists key", () => {
        it("should return undefined", () => {
          assert.deepStrictEqual(val.get("notExists"), undefined);
        });
      });
    });

    describe("#equals", () => {
      it("should return equality for other vals", () => {
        assert(v(0).equals(v(0)));
        assert(!v(0).equals(v(1)));
      });
    });

    describe("#_equals", () => {
      it("should return equality for other vals", () => {
        assert.deepStrictEqual(v(0)._equals(v(0)), v(true));
        assert.deepStrictEqual(v(0)._equals(v(1)), v(false));
      });
    });

    describe("#step", () => {
      it("should return oneself by default behavior", () => {
        assert.deepStrictEqual(val.step(), val);
      });
    });

    describe("#reduce", () => {
      it("should return oneself by default behavior", () => {
        assert.deepStrictEqual(val.reduce(), val);
      });
    });

    describe("#replace", () => {
      it("should return oneself by default behavior", () => {
        assert.deepStrictEqual(val.replace(), val);
      });
    });

    describe("#replaceAsTop", () => {
      it("should return oneself by default behavior", () => {
        assert.deepStrictEqual(val.replaceAsTop(), val);
      });
    });

    describe('#collate', () => {
      it("should return only 'it' collation by default behavior", () => {
        const v0 = new Inherited(0);
        assert.deepStrictEqual(val.collate(v0).result, {__it__: v0});

        const v1 = new Inherited(1);
        assert.deepStrictEqual(val.collate(v1).result, null);
      });
    });

    describe("#match", () => {
      it("should collate the original value equivalency", () => {
        const v0 = new Inherited(0);
        assert.deepStrictEqual(v0.match(val).result, {__it__: v0});

        const v1 = new Inherited(1);
        assert.deepStrictEqual(v1.match(val).result, null);

        const Inherited2 = class extends Val {};
        // same origin but different constructor
        assert(!new Inherited2(0).match(val).result);
      });
    });

    describe("Val.stringify", () => {
      it("should return original value string", () => {
        assert.deepStrictEqual(Val.stringify(v(0)), "0");
      });
    });

    describe("#isUUID", () => {
      it("should return original value string", () => {
        assert.deepStrictEqual(val.isUUID(), false);
      });
    });

    describe("#stringify", () => {
      it("should return original value string", () => {
        assert.deepStrictEqual(val.stringify(), "0");
      });
    });

    describe("#object", () => {
      it("should return origin value", () => {
        assert.deepStrictEqual(val.object({foo: "dummy"}), {"origin": 0, "_proto": "ExtendedVal"});
      });
    });
  });

  context("direct construction", () => {
    it("should throw error", () => {
      assert.throws(() => new Val(0), /Can not create Val instances. 'Val' is abstruct class./);
    });
  });
});
