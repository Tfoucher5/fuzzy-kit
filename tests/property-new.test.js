// Property-based tests for findAll, mapFields, repair and segments: random
// input must never crash, and each result must keep its guarantees.
import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { findAll, mapFields, repair, segments } from '../dist/esm/index.js';

const text = fc.string({ unit: 'grapheme', maxLength: 60 });
const word = fc.string({ unit: fc.constantFrom('a', 'b', 'c', 'é', 'A', '_', '-', ' ', '1', '#'), minLength: 1, maxLength: 10 });
const runs = { numRuns: 300 };

test('findAll: parts inside the text, in order, never overlapping', () => {
  fc.assert(
    fc.property(text, fc.array(word, { maxLength: 8 }), fc.integer({ min: 1, max: 100 }), (message, items, threshold) => {
      const found = findAll(message, items, { threshold });
      let end = 0;
      for (const f of found) {
        assert.ok(f.start >= end && f.end > f.start && f.end <= message.length);
        assert.equal(message.slice(f.start, f.end), f.text);
        assert.equal(items[f.index], f.item);
        assert.ok(f.score >= threshold && f.score <= 100);
        end = f.end;
      }
    }),
    runs,
  );
});

test('mapFields: one to one, every name accounted for', () => {
  fc.assert(
    fc.property(fc.array(word, { maxLength: 8 }), fc.array(word, { maxLength: 8 }), (from, to) => {
      const { mapping, matches, unmatched, missing } = mapFields(from, to);
      assert.equal(matches.length + unmatched.length, from.length);
      assert.equal(matches.length + missing.length, to.length);
      for (let i = 1; i < matches.length; i += 1) assert.ok(matches[i - 1].score >= matches[i].score);
      for (const m of matches) assert.ok(m.score >= 70 && m.score <= 100);
      // Duplicated names collapse in the mapping object, never the other way.
      assert.ok(Object.keys(mapping).length <= matches.length);
    }),
    runs,
  );
});

const json = fc.letrec((tie) => ({
  value: fc.oneof({ depthSize: 'small' }, fc.string(), fc.integer(), fc.boolean(), fc.constant(null), tie('array'), tie('object')),
  array: fc.array(tie('value'), { maxLength: 4 }),
  object: fc.dictionary(word, tie('value'), { maxKeys: 4 }),
})).value;

const schema = fc.letrec((tie) => ({
  node: fc.oneof(
    { depthSize: 'small' },
    fc.record({ type: fc.constantFrom('string', 'number', 'integer', 'boolean', 'null', 'array', 'object') }, { requiredKeys: [] }),
    fc.record({ enum: fc.array(fc.oneof(fc.string({ maxLength: 6 }), fc.integer()), { minLength: 1, maxLength: 4 }) }),
    fc.record({ type: fc.constant('array'), items: tie('node') }),
    fc.record(
      {
        type: fc.constant('object'),
        properties: fc.dictionary(word, tie('node'), { maxKeys: 4 }),
        required: fc.array(word, { maxLength: 3 }),
        additionalProperties: fc.boolean(),
      },
      { requiredKeys: ['properties'] },
    ),
  ),
})).node;

test('repair: never changes its input, every change is listed, and repairing twice changes nothing more', () => {
  fc.assert(
    fc.property(json, schema, (value, rule) => {
      const before = JSON.stringify(value);
      const once = repair(value, rule);
      assert.equal(JSON.stringify(value), before, 'the input is left alone');
      if (once.changes.length === 0) assert.equal(JSON.stringify(once.value), before);
      for (const change of once.changes) assert.ok(['key', 'value', 'type', 'removed'].includes(change.kind));
      // A repaired value is stable: nothing left that repair would change.
      const twice = repair(once.value, rule);
      assert.equal(JSON.stringify(twice.value), JSON.stringify(once.value));
    }),
    runs,
  );
});

test('segments: the parts give the text back', () => {
  fc.assert(
    fc.property(text, fc.array(fc.tuple(fc.integer({ min: -5, max: 70 }), fc.integer({ min: -5, max: 70 })), { maxLength: 6 }), (value, ranges) => {
      const parts = segments(value, ranges);
      assert.equal(parts.map((p) => p.text).join(''), value);
      for (const p of parts) assert.ok(p.text.length > 0);
    }),
    runs,
  );
});
