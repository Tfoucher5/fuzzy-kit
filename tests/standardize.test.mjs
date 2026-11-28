import test from 'node:test';
import assert from 'node:assert/strict';
import { group, standardize } from '../dist/esm/index.js';

test('standardize: the most common spelling of each group, first seen on a tie', () => {
  assert.deepEqual(standardize(['Paris', 'paris', 'Pariss', 'Lyon', 'Paris', 'lyon ']), ['Paris', 'Paris', 'Paris', 'Lyon', 'Paris', 'Lyon']);
  assert.deepEqual(standardize(['paris', 'Paris', 'Paris']), ['Paris', 'Paris', 'Paris']);
  assert.deepEqual(standardize(['b', 'a']), ['b', 'a']);
  assert.deepEqual(standardize([]), []);
});

test('standardize: options pass through, the input is left alone, same groups as group()', () => {
  const values = ['ACME Inc', 'Acme', 'acme inc.', 'Globex'];
  const copy = [...values];
  assert.deepEqual(standardize(values, { ignoreWords: ['inc'] }), ['ACME Inc', 'ACME Inc', 'ACME Inc', 'Globex']);
  assert.deepEqual(values, copy);
  assert.deepEqual(standardize(['colour', 'color'], { threshold: 100 }), ['colour', 'color']);
  const words = ['night', 'nigth', 'knight', 'light', 'Light', 'lihgt', 'nite'];
  const cleaned = standardize(words);
  for (const members of group(words)) {
    const spellings = new Set(members.map((m) => cleaned[words.indexOf(m)]));
    assert.equal(spellings.size, 1, members.join(', '));
  }
});
