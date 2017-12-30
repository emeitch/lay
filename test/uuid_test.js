import assert from 'assert';

import UUID, { uuid } from '../src/uuid';

describe("UUID", () => {
  describe("#toString", () => {
    it("should return uuid urn", () => {
      assert(new UUID().toString().match(/^urn:uuid:.*$/));
    });
  });

  describe("#toJSON", () => {
    it("should return uuid urn", () => {
      const u = uuid();
      assert(u.toJSON() === u.toString());
    });
  });
});
