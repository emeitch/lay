import assert from 'assert';

import v from '../src/v';
import Path, { path } from '../src/path';
import { uuid } from '../src/uuid';
import Exp, { exp } from '../src/exp';
import { sym } from '../src/sym';
import { func, plus, concat } from '../src/func';
import { pack } from '../src/pack';
import Store from '../src/store';

describe("Path", () => {
  const id1 = uuid();
  const id2 = uuid();
  const id3 = uuid();

  let p;
  beforeEach(() => {
    p = new Path(id1, id2, id3);
  });

  describe("constructor", () => {
    it("should complete prim string", () => {
      const pth = new Path(v("foo"), [v("bar"), v("buz")], [v("fiz")]);
      assert.deepStrictEqual(new Path(v("foo"), ["bar", "buz"], "fiz"), pth);
    });

    context("packed uuid receiver", () => {
      assert.deepStrictEqual(new Path(pack(id1), ["bar", "buz"], "fiz").origin[0], id1);
    });

    context("unpacked uuid receiver", () => {
      assert.deepStrictEqual(new Path(id1, ["bar", "buz"], "fiz").origin[0], [id1]);
    });

    context("call a func", () => {
      it("should complete a exp", () => {
        const p = new Path(["foo", "bar"]);
        assert.deepStrictEqual(p.origin[0].constructor, Exp);
      });
    });

    context("obj", () => {
      it("should take _id as id", () => {
        const id = uuid();
        const obj0 = v({_id: id});
        const obj1 = v({_id: v("bar")});
        const p = new Path("foo", obj0, obj1);
        assert.deepStrictEqual(p.origin[1], [id]);
        assert.deepStrictEqual(p.origin[2], [v("bar")]);
      });
    });
  });

  describe("#receiver", () => {
    it("should return the first id", () => {
      assert.deepStrictEqual(p.receiver, id1);
    });

    context("not array receiver", () => {
      it("should return the first id", () => {
        const p = path(v("foo"), "bar");
        assert.deepStrictEqual(p.receiver, v("foo"));
      });
    });
  });

  describe("#messages", () => {
    it("should return rest ids", () => {
      assert.deepStrictEqual(p.messages, [[id2], [id3]]);
    });
  });

  describe("#tail", () => {
    it("should return the last id", () => {
      assert.deepStrictEqual(p.tail, id3);

      const store = new Store();
      assert.deepStrictEqual(path(pack(p), "tail").reduce(store), id3);
    });
  });

  describe("#isPartial", () => {
    it("should return partial status", () => {
      assert.deepStrictEqual(path(id1, "foo", "bar").isPartial(), true);
      assert.deepStrictEqual(path(v("foo"), v("bar")).isPartial(), true);
      assert.deepStrictEqual(path(v("foo")).isPartial(), false);
      assert.deepStrictEqual(path(id1, id2).isPartial(), false);
    });
  });

  describe("#diff", () => {
    it("should return partial status", () => {
      const p = path("foo", v("bar"), v("buz"));
      assert.deepStrictEqual(p.diff(v({fiz: 3})), {bar: {buz: {fiz: 3}}});
    });
  });

  describe("#reduce", () => {
    let store;
    beforeEach(() => {
      store = new Store();
    });

    context("absolute path with end of uuid", () => {
      const id = uuid();
      const id2 = uuid();
      const id3 = uuid();

      beforeEach(() => {
        store.put({
          _id: id,
          foo: path(id2)
        });
        store.put({
          _id: id2,
          bar: path(id3)
        });
        store.put({
          _id: id3,
          buz: 1
        });
        p = new Path(id, "foo", "bar");
      });

      it("should return the val", () => {
        assert.deepStrictEqual(p.reduce(store), store.fetch(id3));
      });
    });

    context("complex self referencing", () => {
      const id1 = uuid();
      const id2 = uuid();

      beforeEach(() => {
        store.put({
          _id: id1,
          foo: v(1),
          bar: path(sym("self"), "foo"),
        });

        store.put({
          _id: id2,
          foo: v(2),
          bar: path(sym("self"), "foo"),
          buz: func("x", exp(plus, path(id1, "bar"), "x")),
          biz: path("self", ["buz", v(3)]) // without sym
        });
      });

      it("should refer correct self", () => {
        assert.deepStrictEqual(path(id2, "biz").reduce(store), v(4));
      });
    });

    context("assigned sym path chain with self exp", () => {
      const id = uuid();

      beforeEach(() => {
        store.put({
          _id: id,
          foo: func("x", exp(plus, new Path(sym("self"), "bar"), "x")),
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

        context("unreduced path", () => {
          it("should eval equals", () => {
            const p = path(path("foo", "bar"), ["equals", path("foo", "bar")]);
            assert.deepStrictEqual(p.reduce(store), v(true));
          });
        });
      });
    });

    context("access a key which proto has the key", () => {
      const id = uuid();

      beforeEach(() => {
        store.put({
          _proto: "Parent",
          _id: id
        });

        store.put({
          _proto: "Grandparent",
          _key: "Parent",
          _id: uuid(),
          foo: v(2),
          bar: v(3)
        });

        store.put({
          _key: "Grandparent",
          _id: uuid(),
          baz: v(4)
        });
      });

      it("should return the proto's val", () => {
        const p1 = new Path(id, "foo");
        assert.deepStrictEqual(p1.reduce(store), v(2));

        const p2 = new Path(id, "bar");
        assert.deepStrictEqual(p2.reduce(store), v(3));

        const p3 = new Path(id, "baz");
        assert.deepStrictEqual(p3.reduce(store), v(4));
      });
    });

    context("with proto but it dosen't have the key", () => {
      const id = uuid();

      beforeEach(() => {
        const protoName = "Foo";
        store.put({
          _id: id,
          _proto: protoName
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

      context("with self referencing path in comp", () => {
        it("should return nested val", () => {
          const c = v({
            a: {
              b: {
                c: "d"
              }
            },
            foo: path("self", "a", "b")
          });

          assert.deepStrictEqual(path(c, "foo").reduce(store), v({c: "d"}));
          assert.deepStrictEqual(path(c, "foo", "c").reduce(store), v("d"));
        });

        context("abstruct proto", () => {
          it("should return based path", () => {
            const pth = path("self", "a");

            store.put({
              _key: "Foo",
              _id: uuid(),
              foo: pth,
              bar: path("self")
            });

            assert.deepStrictEqual(path("Foo", "foo").reduce(store), pth);
            assert.deepStrictEqual(path("Foo", "bar").reduce(store), path("Foo").reduce(store));
          });
        });

        context("with proto", () => {
          it("should return nested val", () => {
            const pth = path("self", "a", "b");
            store.put({
              _key: "Foo",
              _id: uuid(),
              foo: pth
            });

            const c = v({
              _proto: "Foo",
              a: {
                b: {
                  c: "d"
                }
              },
            });

            assert.deepStrictEqual(path(c, "foo").reduce(store), v({c: "d"}));
            assert.deepStrictEqual(path(c, "foo", "c").reduce(store), v("d"));
          });
        });
      });
    });

    context("path in func", () => {
      it("should replace path args", () => {
        const id = uuid();
        store.put({
          _id: id,
          foo: func("a", exp(concat, v("f"), "a"))
        });

        const e = exp(func("x", new Path(id, ["foo", path(sym("x"))])), v("bar"));
        assert.deepStrictEqual(e.reduce(store), v("fbar"));
      });
    });

    context("inner object", () => {
      it("should return val by the specified inner object", () => {
        const id = uuid();

        const holder1 = uuid();
        store.put({
          _id: holder1,
        });
        store.put({
          _id: path(holder1, id),
          x: 1
        });
        assert.deepStrictEqual(path(holder1, id, "x").reduce(store), v(1));


        const holder2 = uuid();
        store.put({
          _id: holder2,
        });
        store.put({
          _id: path(holder2, id),
          x: 2
        });
        assert.deepStrictEqual(path(holder2, id, "x").reduce(store), v(2));

        store.put({
          _id: id
        });
        const obj = store.fetch(id);
        assert.deepStrictEqual(path(holder2, obj, "x").reduce(store), v(2));
      });
    });

    context("_id referencing", () => {
      it("should return id, that is not resolved obj", () => {
        const id = uuid();
        store.put({
          _id: id
        });
        const p = path(v({_id: id}), "_id");
        assert.deepStrictEqual(p.reduce(store), id);
      });
    });

    context("args contains a path", () => {
      it("should reduce the path to key", () => {
        const id0 = uuid();
        store.put({
          _id: id0,
          foo: 3
        });

        const id1 = uuid();
        store.put({
          _id: id1,
          bar: {
            buz: "foo"
          }
        });

        const p = path(id1, "bar", "buz");
        assert.deepStrictEqual(path(id0, p).reduce(store), v(3));
      });
    });

    context("args contains a partial object as first item", () => {
      it("should flat a path id", () => {
        const id1 = uuid();
        store.put({
          _id: id1,
          bar: {
            buz: "foo"
          }
        });

        const po = path(id1, "bar").reduce(store);
        assert.deepStrictEqual(path(po, "buz"), path(id1, "bar", "buz"));
      });
    });

    context("unknown path", () => {
      const id = uuid();
      const unknownKey1 = uuid();
      const unknownKey2 = uuid();

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
      const id = uuid("foo-bar-buz");
      const p = path(v("bar"), id, ["buz", "fiz"]);
      assert.deepStrictEqual(p.object(), {
        _proto: "Path",
        origin: [
          "bar",
          ["urn:uuid:foo-bar-buz"],
          ["buz", "fiz"]
        ]
      });
    });
  });

  describe("parent", () => {
    it("should return parent path", () => {
      const id0 = uuid();
      assert.deepStrictEqual(path(id0, "bar", "buz").parent(), path(id0, "bar"));
    });

    context("not partial", () => {
      it("should return undefined", () => {
        assert.deepStrictEqual(path("foo").parent(), undefined);
      });
    });
  });

  describe("child", () => {
    it("should return a child path", () => {
      assert(path("foo", "bar").child("buz"), path("foo", "bar", "buz"));
    });
  });

  describe("parse", () => {
    it("should a Path", () => {
      assert.deepStrictEqual(Path.parse("foo.bar"), path("foo", "bar"));
    });

    context("with self", () => {
      assert.deepStrictEqual(Path.parse("self.foo"), path("self", "foo"));
    });
  });

  describe("stringify", () => {
    it("should return string dump", () => {
      const p = new Path(sym("self"), v("foo"));
      assert(p.stringify() === "Path [\n  self, \n  \"foo\"\n]");
    });
  });

  describe("keyString", () => {
    it("should return string for key", () => {
      const p = new Path("foo", "bar", "buz");
      assert(p.keyString() === "foo.bar.buz");
    });

    context("with sym", () => {
      const p = new Path(sym("foo"), "bar", "buz");
      assert.throws(() => p.keyString(), /cannot contains a Sym value/);
    });

    context("with float", () => {
      const p = new Path("foo", "bar", v(1.2));
      assert.throws(() => p.keyString(), /cannot contains a float number value/);
    });

    context("with method call", () => {
      const p = new Path("foo", ["bar", v(1)], "buz");
      assert.throws(() => p.keyString(), /cannot contains a method calling/);
    });
  });
});
