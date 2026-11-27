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

test('CommonJS: Spanish, German and Italian packs', () => {
  const { normalize } = require('../dist/cjs/index.js');
  const es = require('../dist/cjs/lang/es.js').default;
  const de = require('../dist/cjs/lang/de.js').default;
  const it = require('../dist/cjs/lang/it.js').default;
  assert.equal(normalize('treinta y dos', { languages: [es] }), '32');
  assert.equal(normalize('einundzwanzig', { languages: [de] }), '21');
  assert.equal(normalize('ventitre', { languages: [it] }), '23');
});

test('CommonJS: the testing kit', () => {
  const { assertLanguage } = require('../dist/cjs/testing.js');
  const es = require('../dist/cjs/lang/es.js').default;
  assertLanguage(es, { numbers: [['treinta y dos', '32']] });
  assert.throws(() => assertLanguage(es, { numbers: [['dos', '3']] }), /1 problem/);
});

test('CommonJS: fuse.js drop-in is the class itself', () => {
  const Fuse = require('../dist/cjs/compat/fuse.js');
  assert.equal(typeof Fuse, 'function');
  assert.equal(Fuse.default, Fuse);
  assert.equal(new Fuse(['Bohemian Rhapsody']).search('bohemain')[0].item, 'Bohemian Rhapsody');
});

test('CommonJS: Vue and Svelte helpers', () => {
  const { useFuzzySearch } = require('../dist/cjs/vue.js');
  const { fuzzySearch, segments } = require('../dist/cjs/svelte.js');
  assert.equal(useFuzzySearch(['Paris', 'Lyon'], 'lyo').value[0].item, 'Lyon');
  let found;
  fuzzySearch(['Paris', 'Lyon'], 'pari').subscribe((v) => (found = v))();
  assert.equal(found[0].item, 'Paris');
  assert.deepEqual(segments('ab', [[0, 1]]), [{ text: 'a', match: true }, { text: 'b', match: false }]);
});
