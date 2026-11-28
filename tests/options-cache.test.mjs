import { test } from 'node:test';
import assert from 'node:assert/strict';
import { similarity, normalize } from '../dist/esm/index.js';

test('options written in each call reuse the engine of equal options', () => {
  for (let i = 0; i < 3; i++) {
    assert.equal(similarity('Acme Inc', 'acme', { ignoreWords: ['inc'] }), 100);
    assert.equal(similarity('Acme Inc', 'acme', { ignoreWords: ['ltd'] }) < 100, true);
  }
});

test('options that print alike but behave apart are not confused', () => {
  similarity('a', 'b', { threshold: null });
  assert.throws(() => similarity('a', 'b', { threshold: NaN }), /threshold/);
  // Two functions with the same source are different options.
  const upper = { replace: { x: 'y' }, strip: [] };
  assert.equal(normalize('x', upper), 'y');
  assert.equal(normalize('ab', { stripPatterns: [/a/g] }), 'b');
  assert.equal(normalize('ab', { stripPatterns: [/b/g] }), 'a');
  assert.equal(normalize('ab', { stripPatterns: [/A/gi] }), 'b');
});
