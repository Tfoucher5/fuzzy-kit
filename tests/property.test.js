// Property-based tests (fuzzing): random Unicode input must never crash and
// must keep the basic laws of each function. Uses fast-check.
import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { closest, compare, damerau, levenshtein, normalize, search, similarity } from '../dist/esm/index.js';

const text = fc.string({ unit: 'grapheme', maxLength: 40 });
const small = fc.string({ unit: fc.constantFrom('a', 'b', 'c', ' '), maxLength: 12 });
const runs = { numRuns: 300 };

test('levenshtein: identity, symmetry, bounds, triangle inequality', () => {
  fc.assert(
    fc.property(small, small, small, (a, b, c) => {
      const ab = levenshtein(a, b);
      assert.equal(levenshtein(a, a), 0);
      assert.equal(ab, levenshtein(b, a));
      assert.ok(ab <= Math.max(a.length, b.length));
      assert.ok(ab >= Math.abs(a.length - b.length));
      assert.ok(ab <= levenshtein(a, c) + levenshtein(c, b));
      assert.ok(damerau(a, b) <= ab);
    }),
    runs,
  );
});

test('levenshtein with max: exact up to max, max + 1 above', () => {
  fc.assert(
    fc.property(small, small, fc.nat(6), (a, b, max) => {
      const d = levenshtein(a, b);
      assert.equal(levenshtein(a, b, { max }), d <= max ? d : max + 1);
    }),
    runs,
  );
});

test('similarity: between 0 and 100, symmetric, on any Unicode', () => {
  fc.assert(
    fc.property(text, text, (a, b) => {
      const s = similarity(a, b);
      assert.ok(s >= 0 && s <= 100, `score ${s}`);
      assert.equal(s, similarity(b, a));
    }),
    runs,
  );
});

test('normalize is stable: normalizing twice changes nothing', () => {
  fc.assert(
    fc.property(text, (a) => {
      const once = normalize(a);
      assert.equal(normalize(once), once);
    }),
    runs,
  );
});

test('compare, search and closest never throw on random input', () => {
  fc.assert(
    fc.property(text, fc.array(text, { maxLength: 8 }), (query, items) => {
      compare(query, items[0] ?? '');
      const found = search(query, items);
      assert.ok(found.length <= items.length);
      closest(query, items);
    }),
    runs,
  );
});
