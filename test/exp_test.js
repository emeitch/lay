import assert from 'assert';

import { v } from '../src/val';
import { plus } from '../src/func';
import UUID from '../src/uuid';
import Path from '../src/path';
import { exp } from '../src/exp';
import Book from '../src/book';
import Native from '../src/native';

describe("Exp", () => {
  describe("#seq", () => {
    context("simple", () => {
      it("should evalutate one step the expression", () => {
        const e = exp(plus, v(1), v(2));
        const book = new Book();

        const e2 = e.seq(book);
        assert(e2 instanceof Native);

        const e3 = e2.seq(book);
        assert.deepStrictEqual(e3, v(3));
      });
    });

    context("nested", () => {
      it("should evalutate one step the expression", () => {
        const e = exp(plus, v(1), exp(plus, v(2), v(3)));

        const e2 = e.seq();
        assert(e2 instanceof Native);

        const e3 = e2.seq();
        assert.deepStrictEqual(e3, v(6));
      });
    });
  });

  describe("#reduce", () => {
    context("val args", () => {
      it("should reduce the expression", () => {
        const e = exp(plus, v(1), v(2));
        const book = new Book();
        assert.deepStrictEqual(e.reduce(book), v(3));
      });
    });

    context("with ref arg", () => {
      it("should keep the expression", () => {
        const path = new Path(new UUID(), new UUID());
        const e = exp(plus, path, v(2));
        assert(e.reduce() instanceof Native);
      });
    });

    context("nested", () => {
      it("should reduce the nested expression", () => {
        const e = exp(plus, v(1), exp(plus, v(2), v(3)));
        assert.deepStrictEqual(e.reduce(), v(6));
      });
    });
  });
});
