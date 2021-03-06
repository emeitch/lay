import assert from 'assert';

import { std, n } from '../src/stdlib';
import v from '../src/v';
import { uuid } from '../src/uuid';
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
    store = new Store(std);
  });

  describe("if", () => {
    it("should test cond and reduce then exp or else exp", () => {
      const t = exp("if", v(true), v(1), v(2)).reduce(store);
      assert.deepStrictEqual(t, v(1));

      const f = exp("if", v(false), v(1), v(2)).reduce(store);
      assert.deepStrictEqual(f, v(2));
    });
  });

  describe("load", () => {
    it("should load prev act json string val to store", () => {
      const id = uuid();
      const val = v({
        _id: id,
        foo: 1
      });
      const act = new Act(() => {
        return JSON.stringify([
          val.object(store)
        ]);
      });
      store.run(path(act, ["then", path("load")]).reduce(store));
      store.run(path(new Act(() => undefined), ["then", path("load")]).reduce(store)); // invalid act

      assert.deepStrictEqual(store.fetch(id).getOwnProp("foo"), v(1));
    });

    it("should nothing to do without prev act json string", () => {
      store.run(path("load").reduce(store));
    });
  });


  describe("filterObjs", () => {
    it("should filter act arg log by pattern", () => {
      const rid = uuid();
      const rev = v({
        _id: rid.keyVal(),
        _proto: "Revision",
        _rev: rid,
        at: v(new Date())
      });
      const obj1 = v({
        _id: uuid(),
        _proto: "Foo",
        _rev: rid,
        foo: 1
      });
      const obj2 = v({
        _id: uuid(),
        _proto: "Bar",
        _rev: rid,
        foo: 1
      });

      const act = new Act(() => {
        return [
          rev,
          obj1,
          obj2,
        ];
      });
      let passedObjs;
      const act2 = new Act(objs => {
        passedObjs = objs;
      });

      store.run(path(act, ["then", exp("filterObjs", v(["Foo"]))], ["then", act2]).reduce(store));
      assert.deepStrictEqual(passedObjs, [
        rev,
        obj1,
      ]);

      store.run(path(act, ["then", exp("filterObjs", v(["Bar"]))], ["then", act2]).reduce(store));
      assert.deepStrictEqual(passedObjs, [
        rev,
        obj2
      ]);

      store.run(path(act, ["then", exp("filterObjs", v(["Foo", "Bar"]))], ["then", act2]).reduce(store));
      assert.deepStrictEqual(passedObjs, [
        rev,
        obj1,
        obj2
      ]);

      store.run(path(act, ["then", exp("filterObjs", v(["Other"]))], ["then", act2]).reduce(store));
      assert.deepStrictEqual(passedObjs, [
      ]);
    });
  });

  context("accessing Object methods", () => {
    describe("all", () => {
      it("should return self instances", () => {
        store.put({
          _key: "Foo",
          _id: uuid(),
        });
        const id1 = uuid();
        store.put({
          _proto: "Foo",
          _id: id1
        });
        const id2 = uuid();
        store.put({
          _proto: "Foo",
          _id: id2
        });
        const id3 = uuid();
        store.put({
          _proto: "Foo",
          _id: id3,
          _status: v("deleted"), // not exists
        });

        const ids = path("Foo", "all").reduce(store);
        assert.deepStrictEqual(ids.get(0), id1);
        assert.deepStrictEqual(ids.get(1), id2);

        const emp = store.create();
        assert.deepStrictEqual(path(emp, "all").reduce(store), v([]));
      });
    });

    describe("delete", () => {
      it("should delete the obj from all", () => {
        store.put({
          _key: "Foo",
          _id: uuid(),
        });
        const id1 = uuid();
        store.put({
          _proto: "Foo",
          _id: id1
        });

        const ids = path("Foo", "all").reduce(store);
        assert.deepStrictEqual(ids.get(0), id1);

        const act = path(id1, "delete").reduce(store);
        store.run(act);

        const ids2 = path("Foo", "all").reduce(store);
        assert.deepStrictEqual(ids2.get(0), undefined);
      });
    });

    describe("new", () => {
      it("should return a instance creation act", () => {
        store.put({
          _key: "Foo",
          _id: uuid()
        });
        const act = path("Entity", ["create", v({
          _proto: "Foo",
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
        assert.deepStrictEqual(path(obj, "foo").reduce(store), v("foo"));
        assert.deepStrictEqual(path(obj, "bar").reduce(store), v(3));
        assert.deepStrictEqual(path(obj, "buz").reduce(store), v(3));
      });
    });

    describe("_status", () => {
      it("should return active status", () => {
        const id = uuid();
        store.put({
          _id: id
        });

        assert.deepStrictEqual(path(id, "_status").reduce(store), v("active"));
      });
    });

    context("accessing Object's key", () => {
      describe("#set", () => {
        it("should return the Act which run set action", () => {
          const protoName = "Foo";
          const id = uuid();
          store.put({
            _id: id,
            _proto: protoName
          });

          const p = new Path(id, ["set", "foo", exp(plus, v(1), v(2))]);
          const a = p.reduce(store);
          assert.deepStrictEqual(a.constructor, Act);
          store.run(a);

          const o = store.fetch(id);
          assert.deepStrictEqual(o.get("foo", store), v(3));

          const p2 = new Path(id, ["set", "bar", pack(exp(plus, v(1), v(2)))]);
          const a2 = p2.reduce(store);
          assert.deepStrictEqual(a2.constructor, Act);
          store.run(a2);

          const o2 = store.fetch(id);
          assert.deepStrictEqual(o2.get("bar", store), exp(plus, v(1), v(2)));

          const p3 = new Path(id, ["set", "bar", v(null)]);
          const a3 = p3.reduce(store);
          store.run(a3);

          const o3 = store.fetch(id);
          assert.deepStrictEqual(o3.get("bar", store), undefined);
        });

        it("should set partial obj's property", () => {
          const id = uuid();
          store.put(v({
            _id: id,
            foo: {
              bar: 1
            }
          }));
          const pact = path(id, "foo", ["set", "bar", v(2)]).reduce(store);
          store.run(pact);

          assert.deepStrictEqual(path(id, "foo", "bar").reduce(store), v(2));
        });

        context("with inner object", () => {
          it("should set properties to inner object", () => {
            const id = uuid();
            store.put({
              _id: id,
            });
            const holder = uuid();
            store.put({
              _id: holder,
            });

            const a2 = path(holder, id, ["set", "buz", v(5)]).reduce(store);
            store.run(a2);

            const inner = store.fetch(path(holder, id));
            assert.deepStrictEqual(inner.get("buz", store), v(5));
          });
        });

        context("with nested obj properties", () => {
          it("should set nested properties", () => {
            const id = uuid();
            store.put({
              _id: id,
              foo: {
                bar: v(3),
                buz: {
                  fiz: v(4),
                }
              }
            });

            assert.deepStrictEqual(path(id, "foo", "bar").reduce(store), v(3));
            assert.deepStrictEqual(path(id, "foo", "buz", "fiz").reduce(store), v(4));

            const p = path(id, "foo", "buz", ["set", "fiz", v(5)]);
            const a = p.reduce(store);
            store.run(a);

            assert.deepStrictEqual(path(id, "foo", "bar").reduce(store), v(3));
            assert.deepStrictEqual(path(id, "foo", "buz", "fiz").reduce(store), v(5));
          });
        });

        context("with path referencing", () => {
          it("should set a val for the referencing obj", () => {
            const id = store.create({
              foo: 3
            });

            store.assign("bar", path(id));
            
            const a = path("bar", ["set", "foo", v(4)]).reduce(store);
            store.run(a);

            const obj = store.fetch(id);
            assert.deepStrictEqual(obj.getOwnProp("foo"), v(4));
          });
        });
      });

      describe("#get", () => {
        it("should return a val for key", () => {
          const id = uuid();
          store.put({
            _id: id,
          });

          const p = new Path(id, ["set", "foo", v(4)]);
          const a = p.reduce(store);
          store.run(a);

          const val = new Path(id, ["get", "foo"]);
          assert.deepStrictEqual(val.reduce(store), v(4));
        });

        context("exp val", () => {
          it("should retrun a reduced val", () => {
            const id = uuid();
            store.put({
              _id: id,
            });

            const p = new Path(id, ["set", "foo", pack(exp(plus, v(1), v(2)))]);
            const a = p.reduce(store);
            store.run(a);

            const val = new Path(id, ["get", "foo"]);
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
      it("should create a arr", () => {
        const m = path("Arr", ["new", v(1), v(2), v(3)]).reduce(store);
        assert.deepStrictEqual(m, v([1, 2, 3]));
      });

      it("should create a nested arr", () => {
        const m = path("Arr", ["new", v(1), v(2), path("Arr", ["new", v(3), v(4)])]).reduce(store);
        assert.deepStrictEqual(m, v([v(1), v(2), v([v(3), v(4)])]));
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
        const f = func("x", path(sym("x"), ["equals", v(2)]));
        const e1 = path(v([2, 2, 2]), ["every", f]);
        assert.deepStrictEqual(e1.reduce(store), v(true));

        const e2 = path(v([2, 3, 2]), ["every", f]);
        assert.deepStrictEqual(e2.reduce(store), v(false));
      });
    });

    describe("filter", () => {
      it("should filter arg func for items", () => {
        const filtered = path(v([1, 2, 3]), ["filter", func("x", path(sym("x"), ["equals", v(2)]))]).reduce(store);
        assert.deepStrictEqual(filtered, v([2]));
      });
    });

    describe("count", () => {
      it("should return size of a arr", () => {
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

  context("accessing default Obj methods", () => {
    describe("new", () => {
      it("should create a obj", () => {
        const m = path("Obj", ["new", "Foo", "bar", v(1), "buz", v(2)]).reduce(store);
        assert.deepStrictEqual(m, v("Foo", {bar: v(1), buz: v(2)}));
      });

      it("should create a nested obj", () => {
        const exp = path("Obj", ["new", "Foo", "bar", v(1), "buz", path("Obj", ["new", "Fiz", "faz", v(3)])]);
        const m = exp.reduce(store);
        assert.deepStrictEqual(m, v("Foo", {bar: v(1), buz: v("Fiz", {faz: v(3)})}));

        const id = uuid();
        store.put({
          _id: id,
          a: exp
        });
        assert.deepStrictEqual(path(id, "a").reduce(store), v("Foo", {bar: v(1), buz: v("Fiz", {faz: v(3)})}));
      });

      context("illegal arguments", () => {
        it("should throw error", () => {
          assert.throws(() => path("Obj", ["new", "Foo", "bar", v(1), "buz"]).reduce(store), /short arguments error/);
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
        o.proceed();
        console.log = orig;
      });
    });
  });

  context("accessing Act methods", () => {
    describe("new", () => {
      it("should return a new Act instance", () => {
        store.put({
          _key: "Foo",
          _id: uuid()
        });

        const act = path("Act", [
          "new",
          func(
            path("Entity", [
              "create",
              v({
                _proto: "Foo"
              })
            ])
          )]
        ).reduce(store);
        assert(act instanceof Act);

        store.run(act);
        assert.deepStrictEqual(path("Foo", "all", "count").reduce(store), v(1));
      });

      context("with args", () => {
        it("should return a new Act instance", () => {
          const act = path("Act", [
            "new",
            func(
              "arg",
              exp(plus, sym("arg"), v(2))
            )]
          ).reduce(store);
          assert(act instanceof Act);

          const a = act.proceed(v(3));
          assert.deepStrictEqual(a.val, v(5));
        });
      });
    });

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

  context("accessing Store methods", () => {
    describe("Store", () => {
      it("should return a Store proto object", () => {
        assert.deepStrictEqual(path(store.id, "_proto").reduce(store), v("Store"));
      });
    });

    describe("generateAs", () => {
      it("should generate new store and give name", () => {
        const act = path("Store", ["generateAs", "foo"]).reduce(store);
        store.run(act);

        assert.deepStrictEqual(path("foo", "_proto").reduce(store), v("Store"));
      });

      context("currentStore", () => {
        it("should generate new store and give name", () => {
          const act = path("currentStore", ["generateAs", "foo"]).reduce(store);
          store.run(act);

          assert.deepStrictEqual(path("foo", "_proto").reduce(store), v("Store"));
        });
      });

      context("rename generateStoreAs", () => {
        it("should generate new store and give name", () => {
          const act = path("currentStore", ["generateStoreAs", "foo"]).reduce(store);
          store.run(act);

          assert.deepStrictEqual(path("foo", "_proto").reduce(store), v("Store"));
        });
      });
    });

    describe("importedStores", () => {
      it("should return imported stores", () => {
        const s1 = new Store();
        store.import(s1);

        const s2 = new Store();
        store.import(s2);

        assert.deepStrictEqual(path("currentStore", "importedStores").reduce(store), v([std.id, s1.id, s2.id]));
      });

      context("specified a importedStore", () => {
        it("should return imported stores", () => {
          const s1 = new Store();
          store.import(s1);

          const sc1 = new Store();
          s1.import(sc1);

          const sc2 = new Store();
          s1.import(sc2);

          assert.deepStrictEqual(path(s1.id, "importedStores").reduce(store), v([sc1.id, sc2.id]));
        });
      });
    });

    describe("set", () => {
      it("should set obj's property", () => {
        const id = uuid();
        const pact = path(store.id, ["set", id, "foo", v(1)]).reduce(store);
        store.run(pact);

        assert.deepStrictEqual(path(id, "foo").reduce(store), v(1));
      });

      context("other store", () => {
        it("should set obj's property", () => {
          const b = new Store(std);
          store.import(b);

          const id = uuid();
          const pact = path(b.id, ["set", id, "foo", v(1)]).reduce(store);
          store.run(pact);

          assert.deepStrictEqual(path(id, "foo").reduce(store), v(1));
          assert.deepStrictEqual(path(id, "foo").reduce(b), v(1));
        });
      });
    });
  });

  describe("n", () => {
    it("should return arr or obj creation path", () => {
      const arr = n([v(10), v(11), v(12)]);
      assert.deepStrictEqual(arr.constructor, Path);
      assert.deepStrictEqual(arr.reduce(store).get(v(0)), v(10));
      assert.deepStrictEqual(arr.reduce(store).protoName, "Arr");

      const obj = n("Mp", {foo: v("bar"), fiz: v("buz")});
      assert.deepStrictEqual(obj.constructor, Path);
      assert.deepStrictEqual(obj.reduce(store).get("foo"), v("bar"));
      assert.deepStrictEqual(obj.reduce(store).get("_proto"), v("Mp"));
      assert.deepStrictEqual(obj.reduce(store).protoName, "Obj");

      const nobj = n({foo: v("bar"), fiz: v("buz")});
      assert.deepStrictEqual(nobj.constructor, Path);
      assert.deepStrictEqual(nobj.reduce(store).get("foo"), v("bar"));
      assert.deepStrictEqual(nobj.reduce(store).protoName, "Obj");

      const nested = n({foo: {bar: v("baz")}, fiz: v("buz")});
      assert.deepStrictEqual(nested.constructor, Path);
      assert.deepStrictEqual(nested.reduce(store).get("foo"), v({bar: v("baz")}));
      assert.deepStrictEqual(nested.reduce(store).protoName, "Obj");

      const nested2 = n({foo: n({bar: v("baz")}), fiz: v("buz")});
      assert.deepStrictEqual(nested2.constructor, Path);
      assert.deepStrictEqual(nested2.reduce(store).reduce(store).get("foo"), v({bar: v("baz")}));
      assert.deepStrictEqual(nested2.reduce(store).protoName, "Obj");

      assert.throws(() => n(1), /not Arr or Obj args pattern/);
    });

    describe("reduce", () => {
      it("should return a reduced exp", () => {
        const e = exp(plus, v(1), v(2));
        const pth = path("self", "foo");
        const nobj = n({foo: e, bar: pth});
        const obj = nobj.reduce(store);

        assert.deepStrictEqual(obj.get("foo"), v(3));

        // not reduced inner path
        assert.deepStrictEqual(obj.get("bar"), pth);

        // reduced inner path
        assert.deepStrictEqual(path(nobj, "bar").reduce(store), v(3));
      });
    });
  });
});
