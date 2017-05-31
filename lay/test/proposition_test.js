import assert from 'assert';

import UUID from '../src/uuid'
import Proposition from '../src/proposition';

describe("Proposition", () => {
  const subj = new UUID();
  const rel = new UUID();
  const obj = new UUID();

  let p;
  beforeEach(() => {
    p = new Proposition(subj, rel, obj);
  });
  
  describe("#id", () => {
    it("should return sha256 urn", () => {
      assert(p.id.match(/^urn:sha256:.*$/));
    });
  });
});
