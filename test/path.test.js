import assert from 'assert';

import v from '../src/v';
import Path, { path } from '../src/path';
import UUID from '../src/uuid';
import Exp, { exp } from '../src/exp';
import { func, plus, concat } from '../src/func';
import Store from '../src/store';

describe("Path", () => {
  const id1 = new UUID();
  const id2 = new UUID();
  const id3 = new UUID();

  let p;
  beforeEach(() => {
    p = new Path(id1, id2, id3);
  });

  describe("constructor", () => {
    it("should complete prim string", () => {
      assert.deepStrictEqual(new Path("foo", ["bar", "buz"], "fiz"), new Path("foo", [v("bar"), v("buz")], v("fiz")));
    });
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

  describe("#reduce", () => {
    let store;
    beforeEach(() => {
      store = new Store();
    });

    context("absolute path with end of uuid", () => {
      const id = new UUID();
      const id2 = new UUID();
      const id3 = new UUID();

      beforeEach(() => {
        store.put({
          _id: id,
          foo: id2
        });
        store.put({
          _id: id2,
          bar: id3
        });
        p = new Path(id, "foo", "bar");
      });

      it("should return the val", () => {
        assert.deepStrictEqual(p.reduce(store), id3);
      });
    });

    context("complex self referencing", () => {
      const id1 = new UUID();
      const id2 = new UUID();

      beforeEach(() => {
        store.put({
          _id: id1,
          foo: v(1),
          bar: path("self", "foo"),
        });

        store.put({
          _id: id2,
          foo: v(2),
          bar: path("self", "foo"),
          buz: func("x", exp(plus, path(id1, "bar"), "x")),
          biz: path("self", ["buz", v(3)])
        });
      });

      it("should refer correct self", () => {
        assert.deepStrictEqual(path(id2, "biz").reduce(store), v(4));
      });
    });

    context("assigned sym path chain with self exp", () => {
      const id = new UUID();

      beforeEach(() => {
        store.put({
          _id: id,
          foo: func("x", exp(plus, new Path("self", "bar"), "x")),
          bar: v(2)
        });
        p = new Path(id, ["foo", v(3)]);
      });

      it("should return the val", () => {
        assert.deepStrictEqual(p.reduce(store), v(5));
      });
    });

    context("access js object property", () => {
      describe("equals", () => {
        it("should return equality", () => {
          const p = path(v(3), ["equals", exp(plus, v(1), v(2))]);
          assert.deepStrictEqual(p.reduce(store), v(true));
        });

        context("partial reduce", () => {
          it("should return a exp", () => {
            const id = new UUID();
            const p = path(v(3), ["equals", path(id, "bar")]);
            assert.deepStrictEqual(p.reduce(store).constructor, Exp);

            store.put({
              _id: id,
              bar: v(3)
            });
            assert.deepStrictEqual(p.reduce(store), v(true));
          });
        });
      });
    });

    context("access a key which type has the key", () => {
      const id = new UUID();

      beforeEach(() => {
        store.put({
          _id: id,
          type: [
            path("parent1"),
            path("parent2")
          ]
        });

        store.put({
          _id: "parent1",
          foo: v(1)
        });
        store.put({
          _id: "parent2",
          type: path("grandparent"),
          foo: v(2),
          bar: v(3)
        });
        store.put({
          _id: "grandparent",
          baz: v(4)
        });
      });

      it("should return the type's val", () => {
        const p1 = new Path(id, "foo");
        assert.deepStrictEqual(p1.reduce(store), v(1));

        const p2 = new Path(id, "bar");
        assert.deepStrictEqual(p2.reduce(store), v(3));

        const p3 = new Path(id, "baz");
        assert.deepStrictEqual(p3.reduce(store), v(4));
      });
    });

    context("with type but it dosen't have the key", () => {
      const id = new UUID();

      beforeEach(() => {
        const typeid = new UUID();
        store.put({
          _id: id,
          type: typeid
        });
      });

      it("should return the path", () => {
        const p = new Path(id, "foo");
        assert.deepStrictEqual(p.reduce(store), p);
      });
    });

    context("with comp val", () => {
      it("should return nested val", () => {
        const c = v({a: {b: {c: "d"}}});

        {
          const p = new Path(c, "a", "b");
          assert.deepStrictEqual(p.reduce(store), v({c: "d"}));
        }

        {
          const p = new Path(c, "a", "b", "c");
          assert.deepStrictEqual(p.reduce(store), v("d"));
        }
      });
    });

    context("path in func", () => {
      it("should replace path args", () => {
        const id = new UUID();
        store.put({
          _id: id,
          foo: func("a", exp(concat, v("f"), "a"))
        });

        const e = exp(func("x", new Path(id, ["foo", path("x")])), v("bar"));
        assert.deepStrictEqual(e.reduce(store), v("fbar"));
      });
    });

    context("context object", () => {
      it("should return val by specified context object", () => {
        const id = new UUID();

        const holder1 = new UUID();
        const context1 = new UUID();
        store.put({
          _id: holder1,
          [id]: context1
        });
        store.put({
          _id: context1,
          x: 1
        });

        const holder2 = new UUID();
        const context2 = new UUID();
        store.put({
          _id: holder2,
          [id]: context2
        });
        store.put({
          _id: context2,
          x: 2
        });

        assert.deepStrictEqual(path(holder1, id, "x").reduce(store), v(1));
        assert.deepStrictEqual(path(holder2, id, "x").reduce(store), v(2));
      });
    });

    context("unknown path", () => {
      const id = new UUID();
      const unknownKey1 = new UUID();
      const unknownKey2 = new UUID();

      beforeEach(() => {
        p = path(id, unknownKey1, unknownKey2);
      });

      it("should return the path", () => {
        assert.deepStrictEqual(p.reduce(store), p);
      });
    });
  });

  describe("object", () => {
    it("should return js object dump", () => {
      const id = new UUID("foo");
      const p = path(id, "bar", "buz");
      assert.deepStrictEqual(p.object(), {
        type: {
          origin: "Path"
        },
        origin: [
          {
            type: {
              origin: "UUID"
            },
            origin: "foo"
          },
          "bar",
          "buz"
        ]
      });
    });
  });

  describe("stringify", () => {
    it("should return string dump", () => {
      const p = new Path("self", v("foo"));
      assert(p.stringify() === "Path [\n  self, \n  \"foo\"\n]");
    });
  });
});
