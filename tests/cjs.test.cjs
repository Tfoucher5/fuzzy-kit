const test = require('node:test');
const assert = require('node:assert/strict');
const { similarity, check } = require('../dist/cjs/index.js');

test('CommonJS build works', () => {
  assert.equal(similarity('Molière', 'moliere'), 100);
  assert.equal(check('beatles', 'The Beatles', { preset: 'music' }).correct, true);
});

test('CommonJS: string-similarity drop-in', () => {
  const stringSimilarity = require('../dist/cjs/compat/string-similarity.js');
  assert.equal(stringSimilarity.compareTwoStrings('healed', 'sealed'), 0.8);
  assert.equal(stringSimilarity.findBestMatch('healed', ['edward', 'sealed']).bestMatchIndex, 1);
});

test('CommonJS: extensions', () => {
  const { defineLanguage, definePreset, normalize } = require('../dist/cjs/index.js');
  const fr = require('../dist/cjs/lang/fr.js');
  assert.equal(fr.default.code, 'fr');
  const es = defineLanguage({ code: 'es', numbers: { units: ['cero', 'uno', 'dos'] } });
  assert.equal(normalize('dos', { languages: [es] }), '2');
  assert.equal(definePreset({ name: 'x', extends: 'music', options: {} }).options.strip.length, 4);
});
