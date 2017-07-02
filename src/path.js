import Ref from './ref';
import ID from './id';
import { self } from './self';

export default class Path extends Ref {
  constructor(...ids) {
    const [receiver, ...keys] = ids;
    if (!(receiver instanceof ID) && receiver !== self) {
      throw `${receiver} is not a ID or a Self`;
    }
    for (const id of keys) {
      if (!(id instanceof ID)) {
        throw `${id} is not a ID`;
      }
    }
    super(ids);
    this.receiver = receiver;
    this.keys = keys;
  }

  toString() {
    return this.origin.join("/");
  }
}
