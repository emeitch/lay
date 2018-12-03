import assert from 'assert';

import { std, stdlib, n } from '../src/stdlib';
import v from '../src/v';
import UUID from '../src/uuid';
import Book from '../src/book';
import Store from '../src/store';
import Act from '../src/act';
import Path, { path } from '../src/path';
import { func, plus } from '../src/func';
import { exp } from '../src/exp';
import { pack } from '../src/pack';
import { sym } from '../src/sym';

describe("stdlib", () => {
  let store;
  beforeEach(() => {
    store = new Book(stdlib);
  });

  describe("if", () => {
    it("should test cond and reduce then exp or else exp", () => {
      const store = new Store(std);

      const t = exp("if", v(true), v(1), v(2)).reduce(store);
      assert.deepStrictEqual(t, v(1));

      const f = exp("if", v(false), v(1), v(2)).reduce(store);
      assert.deepStrictEqual(f, v(2));
    });
  });

  describe("load", () => {
    it("should load prev act json string val to store", () => {
      const store = new Store(std);

      const key = new UUID();
      const val = v({
        foo: 1
      });
      const act = new Act(() => {
        return JSON.stringify([
          {key: key.object(store), val: val.object(store)}
        ]);
      });
      store.run(path(act, ["then", exp("load")]).deepReduce(store));
      store.run(path(new Act(() => undefined), ["then", exp("load")]).deepReduce(store)); // invalid act

      assert.deepStrictEqual(store.get(key), val);
    });

    it("should nothing to do without prev act json string", () => {
      const store = new Store(std);
      const size = store.objs.size;
      store.run(exp("load").deepReduce(store));
      assert(size === store.objs.size);
    });
  });


  describe("filterPiars", () => {
    it("should filter act arg log by pattern", () => {
      const store = new Store(std);
      const pair1 = {
        key: new UUID(),
        val: v({
          type: path("Foo"),
          foo: 1
        })
      };
      const pair2 = {
        key: new UUID(),
        val: v({
          type: path("Bar"),
          foo: 1
        })
      };

      const act = new Act(() => {
        return [
          pair1,
          pair2,
        ];
      });
      let passedObjs;
      const act2 = new Act(objs => {
        passedObjs = objs;
      });

      store.run(path(act, ["then", exp("filterPiars", v(["Foo"]))], ["then", act2]).deepReduce(store));
      assert.deepStrictEqual(passedObjs, [
        pair1,
      ]);

      store.run(path(act, ["then", exp("filterPiars", v(["Bar"]))], ["then", act2]).deepReduce(store));
      assert.deepStrictEqual(passedObjs, [
        pair2
      ]);

      store.run(path(act, ["then", exp("filterPiars", v(["Foo", "Bar"]))], ["then", act2]).deepReduce(store));
      assert.deepStrictEqual(passedObjs, [
        pair1,
        pair2
      ]);

      store.run(path(act, ["then", exp("filterPiars", v(["Other"]))], ["then", act2]).deepReduce(store));
      assert.deepStrictEqual(passedObjs, [
      ]);
    });
  });

  context("accessing Object methods", () => {
    describe("all", () => {
      it("should return self instances", () => {
        store.set("Foo", store.new());
        const id1 = store.new({"type": pack(path("Foo"))});
        const id2 = store.new({"type": pack(path("Foo"))});

        const ids = path("Foo", "all").reduce(store);
        assert.deepStrictEqual(ids.get(0), id1);
        assert.deepStrictEqual(ids.get(1), id2);

        const emp = store.new();
        assert.deepStrictEqual(path(emp, "all").reduce(store), v([]));
      });
    });

    describe("allOf", () => {
      it("should return array for specified key", () => {
        const typeid = new UUID();
        const id = new UUID();
        store.put(id, "type", typeid);

        {
          const p = new Path(id, ["add", "foo", v(1)]);
          const a = p.reduce(store);
          store.run(a);
        }

        {
          const p = new Path(id, ["add", "foo", v(2)]);
          const a = p.reduce(store);
          store.run(a);
        }

        assert.deepStrictEqual(path(id, ["allOf", "foo"]).reduce(store), v([v(1), v(2)]));
      });
    });

    describe("new", () => {
      it("should return a instance creation act", () => {
        store.set("Foo", store.new());
        const act = path("Object", ["new", v({
          type: pack(path("Foo")),
          foo: v("foo"),
          bar: path([plus, v(1), v(2)]),
          buz: pack(path([plus, v(1), v(2)]))
        })]).reduce(store);

        assert.deepStrictEqual(act.constructor, Act);

        let ov;
        const act2 = act.then(new Act(id => {
          ov = id;
        }));

        store.run(act2);

        const obj = path("Foo", "all", v(0)).reduce(store);
        assert.deepStrictEqual(ov, obj);
        assert.deepStrictEqual(obj.get("foo", store), v("foo"));
        assert.deepStrictEqual(path(obj, "foo").reduce(store), v("foo"));

        assert.deepStrictEqual(obj.get("bar", store), v(3));
        assert.deepStrictEqual(path(obj, "bar").reduce(store), v(3));

        assert.deepStrictEqual(obj.get("buz", store), path([plus, v(1), v(2)]));
        assert.deepStrictEqual(path(obj, "buz").reduce(store), v(3));
      });
    });


    context("accessing Object's key", () => {
      describe("#add", () => {
        it("should return the Act which run add action", () => {
          const typeid = new UUID();
          const id = new UUID();
          store.put(id, "type", typeid);

          const p = new Path(id, ["add", "foo", v(1)]);
          const a = p.reduce(store);
          assert.deepStrictEqual(a.constructor, Act);
          store.run(a);

          const r = store.activeRel(id, "foo");
          assert.deepStrictEqual(store.getEdgeHead(r, "object"), v(1));

          const p2 = new Path(id, ["add", "foo", v(2)]);
          const a2 = p2.reduce(store);
          store.run(a2);

          const rels = store.activeRels(id, "foo");
          assert.deepStrictEqual(rels.length, 2);
          assert.deepStrictEqual(store.getEdgeHead(rels[0], "object"), v(1));
          assert.deepStrictEqual(store.getEdgeHead(rels[1], "object"), v(2));
        });
      });

      describe("#def", () => {
        it("should return the Act which run set action", () => {
          const typeid = new UUID();
          const id = new UUID();
          store.put(id, "type", typeid);

          const p = new Path(id, ["def", "foo", exp(plus, v(1), v(2))]);
          const a = p.reduce(store);
          assert.deepStrictEqual(a.constructor, Act);
          store.run(a);

          const r = store.activeRel(id, "foo");
          assert.deepStrictEqual(store.getEdgeHead(r, "object"), exp(plus, v(1), v(2)));

          const p2 = new Path(id, ["def", "foo", exp(plus, v(2), v(3))]);
          const a2 = p2.reduce(store);
          store.run(a2);

          const rels = store.activeRels(id, "foo");
          assert.deepStrictEqual(rels.length, 1); // invalidated old rels
          assert.deepStrictEqual(store.getEdgeHead(rels[0], "object"), exp(plus, v(2), v(3)));
        });
      });

      describe("#set", () => {
        it("should return the Act which run set action", () => {
          const typeid = new UUID();
          const id = new UUID();
          store.put(id, "type", typeid);

          const p = new Path(id, ["set", "foo", exp(plus, v(1), v(2))]);
          const a = p.reduce(store);
          assert.deepStrictEqual(a.constructor, Act);
          store.run(a);

          const r = store.activeRel(id, "foo");
          assert.deepStrictEqual(store.getEdgeHead(r, "object"), v(3));

          const p2 = new Path(id, ["set", "bar", pack(exp(plus, v(1), v(2)))]);
          const a2 = p2.reduce(store);
          assert.deepStrictEqual(a2.constructor, Act);
          store.run(a2);

          const r2 = store.activeRel(id, "bar");
          assert.deepStrictEqual(store.getEdgeHead(r2, "object"), exp(plus, v(1), v(2)));

          const p3 = new Path(id, ["set", "bar", pack(exp(plus, v(2), v(1)))]);
          const a3 = p3.reduce(store);
          store.run(a3);

          const p4 = new Path(id, ["set", "bar", pack(exp(plus, v(3), v(2)))]);
          const a4 = p4.reduce(store);
          store.run(a4);

          const rels = store.activeRels(id, "bar");
          assert.deepStrictEqual(rels.length, 1); // invalidated old rels
          assert.deepStrictEqual(store.getEdgeHead(rels[0], "object"), exp(plus, v(3), v(2)));

          const p5 = new Path(id, ["set", "bar", v(null)]);
          const a5 = p5.reduce(store);
          store.run(a5);

          const rels5 = store.activeRels(id, "bar");
          assert.deepStrictEqual(rels5.length, 0); // invalidated rels
        });
      });

      describe("#get", () => {
        it("should return a val for key", () => {
          const id = new UUID();

          const p = new Path(id, ["add", "foo", v(4)]);
          const a = p.reduce(store);
          store.run(a);

          const p2 = new Path(id, ["add", "foo", v(5)]);
          const a2 = p2.reduce(store);
          store.run(a2);

          const val = new Path(id, ["get", "foo"]);
          assert.deepStrictEqual(val.reduce(store), v(4));
        });

        context("exp val", () => {
          it("should retrun a reduced val", () => {
            const id = new UUID();

            const p = new Path(id, ["add", "foo", exp(plus, v(1), v(2))]);
            const a = p.reduce(store);
            store.run(a);

            const val = new Path(id, ["get", "foo"]);
            assert.deepStrictEqual(val.reduce(store), v(3));
          });
        });
      });

      describe("#getAtIndex", () => {
        it("should return a val for key and index", () => {
          const id = new UUID();

          const p = new Path(id, ["add", "foo", v(4)]);
          const a = p.reduce(store);
          store.run(a);

          const p2 = new Path(id, ["add", "foo", v(5)]);
          const a2 = p2.reduce(store);
          store.run(a2);

          const val = new Path(id, ["getAtIndex", "foo", v(0)]);
          assert.deepStrictEqual(val.reduce(store), v(4));

          const val2 = new Path(id, ["getAtIndex", "foo", v(1)]);
          assert.deepStrictEqual(val2.reduce(store), v(5));
        });

        context("exp val", () => {
          it("should retrun a reduced val", () => {
            const id = new UUID();

            const p = new Path(id, ["add", "foo", exp(plus, v(1), v(2))]);
            const a = p.reduce(store);
            store.run(a);

            const val = new Path(id, ["getAtIndex", "foo", v(0)]);
            assert.deepStrictEqual(val.reduce(store), v(3));
          });
        });
      });
    });
  });

  context("accessing String methods", () => {
    describe("trim", () => {
      it("should trim the string", () => {
        assert.deepStrictEqual(path(v("hoge   "), "trim").reduce(store), v("hoge"));
      });
    });
  });

  context("accessing Boolean methods", () => {
    describe("not", () => {
      it("should reverse logic", () => {
        assert.deepStrictEqual(path(v(true), "not").reduce(store), v(false));
        assert.deepStrictEqual(path(v(false), "not").reduce(store), v(true));
      });
    });
  });

  context("accessing default Array methods", () => {
    describe("new", () => {
      it("should create a array", () => {
        const m = path("Array", ["new", "Foo", v(1), v(2), v(3)]).reduce(store);
        assert.deepStrictEqual(m, v("Foo", [1, 2, 3]));
      });

      it("should create a nested array", () => {
        const m = path("Array", ["new", "Foo", v(1), v(2), path("Array", ["new", "Fiz", v(3), v(4)])]).deepReduce(store);
        assert.deepStrictEqual(m, v("Foo", [v(1), v(2), v("Fiz", [v(3), v(4)])]));
      });
    });

    describe("map", () => {
      it("should map arg func for items", () => {
        const mapped = path(v([1, 2, 3]), ["map", func("x", exp(plus, "x", v(1)))]).reduce(store);
        assert.deepStrictEqual(mapped, v([2, 3, 4]));
      });
    });

    describe("every", () => {
      it("should all arg func returns true", () => {
        const f = func("x", path("x", ["equals", v(2)]));
        const e1 = path(v([2, 2, 2]), ["every", f]);
        assert.deepStrictEqual(e1.reduce(store), v(true));

        const e2 = path(v([2, 3, 2]), ["every", f]);
        assert.deepStrictEqual(e2.reduce(store), v(false));
      });
    });

    describe("filter", () => {
      it("should filter arg func for items", () => {
        const filtered = path(v([1, 2, 3]), ["filter", func("x", path("x", ["equals", v(2)]))]).reduce(store);
        assert.deepStrictEqual(filtered, v([2]));
      });
    });

    describe("count", () => {
      it("should return size of array", () => {
        const count = path(v([1, 2, 3]), "count").reduce(store);
        assert.deepStrictEqual(count, v(3));
      });
    });

    describe("join", () => {
      it("should return joined string", () => {
        const joined = path(v(["1", "2", "3"]), ["join", ","]).reduce(store);
        assert.deepStrictEqual(joined, v("1,2,3"));
      });
    });
  });

  context("accessing default Map methods", () => {
    describe("new", () => {
      it("should create a map", () => {
        const m = path("Map", ["new", "Foo", "bar", v(1), "buz", v(2)]).reduce(store);
        assert.deepStrictEqual(m, v("Foo", {bar: v(1), buz: v(2)}));
      });

      it("should create a nested map", () => {
        const exp = path("Map", ["new", "Foo", "bar", v(1), "buz", path("Map", ["new", "Fiz", "faz", v(3)])]);
        const m = exp.deepReduce(store);
        assert.deepStrictEqual(m, v("Foo", {bar: v(1), buz: v("Fiz", {faz: v(3)})}));

        store.set("a", exp);
        assert.deepStrictEqual(path("a").deepReduce(store), v("Foo", {bar: v(1), buz: v("Fiz", {faz: v(3)})}));
      });

      context("illegal arguments", () => {
        it("should throw error", () => {
          assert.throws(() => path("Map", ["new", "Foo", "bar", v(1), "buz"]).reduce(store), /short arguments error/);
        });
      });
    });

    describe("get", () => {
      it("should return the property", () => {
        const val = path(v({a: 1, b: 2}), ["get", "b"]).reduce(store);
        assert.deepStrictEqual(val, v(2));
      });
    });
  });

  context("accessing Console methods", () => {
    describe("puts", () => {
      it("should return a Act", () => {
        const o = path("Console", ["puts", v("foo")]).reduce(store);

        // stub
        const orig = console.log;
        console.log = arg => {
          assert.deepStrictEqual(arg, "foo");
        };
        o.id.proceed();
        console.log = orig;
      });
    });
  });

  context("accessing Act methods", () => {
    describe("then", () => {
      it("should return a chained Act", () => {
        const f1 = () => {};
        const f2 = () => {};
        const a1 = new Act(f1);
        const a2 = new Act(f2);

        const act = path(a1, ["then", a2]).reduce(store);
        assert(act.executor === f1);
        assert(act.next.executor === f2);
      });
    });
  });

  context("accessing Book methods", () => {
    describe("Book", () => {
      it("should return a Book type object", () => {
        const storeClass = path("Book").reduce(store);

        assert.deepStrictEqual(storeClass.constructor, UUID);
        assert.deepStrictEqual(path(store.id, "type").reduce(store), storeClass);
      });
    });

    describe("generateAs", () => {
      it("should generate new store and give name", () => {
        const bact = path("Book", ["generateAs", "foo"]).reduce(store);
        store.run(bact);

        const storeClass = path("Book").reduce(store);
        assert.deepStrictEqual(path("foo", "type").reduce(store), storeClass);
      });

      context("currentBookId", () => {
        it("should generate new store and give name", () => {
          const bact = path("currentBookId", ["generateAs", "foo"]).reduce(store);
          store.run(bact);

          const storeClass = path("Book").reduce(store);
          assert.deepStrictEqual(path("foo", "type").reduce(store), storeClass);
        });
      });

      context("rename generateBookAs", () => {
        it("should generate new store and give name", () => {
          const bact = path("currentBookId", ["generateBookAs", "foo"]).reduce(store);
          store.run(bact);

          const storeClass = path("Book").reduce(store);
          assert.deepStrictEqual(path("foo", "type").reduce(store), storeClass);
        });
      });
    });

    describe("importedBooks", () => {
      it("should return imported stores", () => {
        const b1 = new Book();
        store.import(b1);

        const b2 = new Book();
        store.import(b2);

        assert.deepStrictEqual(path("currentBookId", "importedBooks").reduce(store), v([stdlib.id, b1.id, b2.id]));
      });

      context("specified a importedBook", () => {
        it("should return imported stores", () => {
          const b1 = new Book();
          store.import(b1);

          const bc1 = new Book();
          b1.import(bc1);

          const bc2 = new Book();
          b1.import(bc2);

          assert.deepStrictEqual(path(b1.id, "importedBooks").reduce(store), v([bc1.id, bc2.id]));
        });
      });
    });

    describe("put", () => {
      it("should put a log", () => {
        const id = new UUID();
        const pact = path(store.id, ["put", id, "foo", v(1)]).reduce(store);
        store.run(pact);

        assert.deepStrictEqual(path(id, "foo").reduce(store), v(1));
      });

      context("other store", () => {
        it("should put a log", () => {
          const b = new Book(stdlib);
          store.import(b);

          const id = new UUID();
          const pact = path(b.id, ["put", id, "foo", v(1)]).reduce(store);
          store.run(pact);

          assert.deepStrictEqual(path(id, "foo").reduce(store), v(1));
          assert.deepStrictEqual(path(id, "foo").reduce(b), v(1));
        });
      });
    });
  });

  describe("n", () => {
    it("should return array or map creation path", () => {
      const arr = n("Arr", [v(10), v(11), v(12)]);
      assert.deepStrictEqual(arr.constructor, Path);
      assert.deepStrictEqual(arr.reduce(store).get(v(0)), v(10));
      assert.deepStrictEqual(arr.reduce(store).get("head"), v("Arr"));
      assert.deepStrictEqual(arr.reduce(store).get("type"), sym("Array"));

      const narr = n([v(10), v(11), v(12)]);
      assert.deepStrictEqual(narr.constructor, Path);
      assert.deepStrictEqual(narr.reduce(store).get(v(0)), v(10));
      assert.deepStrictEqual(narr.reduce(store).get("head"), v(null));
      assert.deepStrictEqual(narr.reduce(store).get("type"), sym("Array"));

      const map = n("Mp", {foo: v("bar"), fiz: v("buz")});
      assert.deepStrictEqual(map.constructor, Path);
      assert.deepStrictEqual(map.reduce(store).get("foo"), v("bar"));
      assert.deepStrictEqual(map.reduce(store).get("head"), v("Mp"));
      assert.deepStrictEqual(map.reduce(store).get("type"), sym("Map"));

      const nmap = n({foo: v("bar"), fiz: v("buz")});
      assert.deepStrictEqual(nmap.constructor, Path);
      assert.deepStrictEqual(nmap.reduce(store).get("foo"), v("bar"));
      assert.deepStrictEqual(nmap.reduce(store).get("type"), sym("Map"));

      const nested = n({foo: {bar: v("baz")}, fiz: v("buz")});
      assert.deepStrictEqual(nested.constructor, Path);
      assert.deepStrictEqual(nested.reduce(store).get("foo"), v({bar: v("baz")}));
      assert.deepStrictEqual(nested.reduce(store).get("type"), sym("Map"));

      const nested2 = n({foo: n({bar: v("baz")}), fiz: v("buz")});
      assert.deepStrictEqual(nested2.constructor, Path);
      assert.deepStrictEqual(nested2.deepReduce(store).get("foo"), v({bar: v("baz")}));
      assert.deepStrictEqual(nested2.deepReduce(store).get("type"), sym("Map"));

      const headonly = n("foo");
      assert.deepStrictEqual(headonly.constructor, Path);
      assert.deepStrictEqual(headonly.deepReduce(store).get("head"), v("foo"));

      const withhead = n("bar", v(1));
      assert.deepStrictEqual(withhead.constructor, Path);
      assert.deepStrictEqual(withhead.deepReduce(store).get("head"), v("bar"));
      assert.deepStrictEqual(path(withhead.deepReduce(store), "head").deepReduce(store), v("bar"));
    });

    describe("reduce", () => {
      it("should return a exp", () => {
        const e = exp(plus, v(1), v(2));
        const map = n({foo: e});
        assert.deepStrictEqual(map.reduce(store).get("foo"), e);
      });
    });

    describe("deepReduce", () => {
      it("should return a exp", () => {
        const e = exp(plus, v(1), v(2));
        const map = n({foo: e});
        assert.deepStrictEqual(map.deepReduce(store).get("foo"), v(3));
      });
    });
  });
});
