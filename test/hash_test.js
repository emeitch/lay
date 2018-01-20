import assert from 'assert';

import Hash from '../src/hash';

describe("Hash", () => {
  describe("#stringify", () => {
    context("with args", () => {
      it("should return hash string", () => {
        const h1 = new Hash({a: 1});
        assert.deepStrictEqual(h1.stringify(), "urn:sha1:9f89c740ceb46d7418c924a78ac57941d5e96520");

        const h2 = new Hash({a: 1, b: 2});
        assert.deepStrictEqual(h2.stringify(), "urn:sha1:4acc71e0547112eb432f0a36fb1924c4a738cb49");

        // same h2 args
        const h3 = new Hash({a: 1, b: 2});
        assert.deepStrictEqual(h3.stringify(), "urn:sha1:4acc71e0547112eb432f0a36fb1924c4a738cb49");
      });
    });
  });

  describe("#reducible", () => {
    it("should return true by default behavior", () => {
      const h = new Hash({a: 1});
      assert.deepStrictEqual(h.reducible, false);
    });
  });
});
