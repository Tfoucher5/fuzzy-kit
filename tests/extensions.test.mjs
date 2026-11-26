import test from 'node:test';
import assert from 'node:assert/strict';
import {
  API_VERSION,
  check,
  compare,
  createIndex,
  createMatcher,
  defineLanguage,
  definePreset,
  loadIndex,
  normalize,
} from '../dist/esm/index.js';
import en from '../dist/esm/lang/en.js';
import fr from '../dist/esm/lang/fr.js';

// A small Spanish pack, the way a contributor would write one.
const es = defineLanguage({
  code: 'es',
  name: 'Spanish',
  numbers: {
    units: ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'],
    tens: ['', '', 'veinte', 'treinta', 'cuarenta'],
    words: { una: 1, veintiuno: 21 },
    ordinals: ['', 'primero', 'segundo', 'tercero'],
    ordinalWords: { primera: 1 },
    joiner: 'y',
  },
  articles: ['el', 'la', 'los', 'las'],
  stopwords: ['de', 'y'],
  phonetic: [[/v/g, 'b'], [/ll/g, 'y'], [/h/g, '']],
});

/* languages ------------------------------------------------------------------ */

test('defineLanguage() returns a frozen, versioned pack', () => {
  assert.equal(es.kind, 'language');
  assert.equal(es.apiVersion, API_VERSION);
  assert.ok(Object.isFrozen(es));
  assert.equal(en.code, 'en');
  assert.equal(fr.code, 'fr');
});

test('defineLanguage() explains what is wrong', () => {
  assert.throws(() => defineLanguage({ code: 'Spanish' }), /"code" must be a lower-case language code/);
  assert.throws(() => defineLanguage({ code: 'es', articles: 'el' }), /"articles" must be an array/);
  assert.throws(() => defineLanguage({ code: 'es', phonetic: [['v', 'b']] }), /\[RegExp, string\]/);
  assert.throws(() => defineLanguage({ code: 'es', numbers: { joiner: 'y y' } }), /single word/);
});

test('languages: numbers in words come from the packs', () => {
  assert.equal(normalize('treinta y dos', { languages: [es] }), '32');
  assert.equal(normalize('veintiuno', { languages: [es] }), '21');
  assert.equal(normalize('el segundo', { languages: [es] }), 'el 2');
  // English is not active: "two" stays a word.
  assert.equal(normalize('two dos', { languages: [es] }), 'two 2');
  assert.equal(normalize('two dos', { languages: ['en', es] }), '2 2');
  assert.equal(normalize('Cent Mille', { languages: [] }), 'cent mille');
  // Roman numerals work in every language.
  assert.equal(normalize('Rocky IV', { languages: [es] }), 'rocky 4');
});

test('languages: default stays English and French', () => {
  assert.equal(normalize('quatre vingt dix sept'), '97');
  assert.equal(normalize('twenty one'), '21');
  assert.equal(normalize('quatre vingt dix sept', { languages: ['en', 'fr'] }), '97');
  assert.equal(normalize('la 2eme'), 'la 2e');
  assert.equal(normalize('la 2eme', { languages: ['en'] }), 'la 2eme');
});

test('languages: articles follow the active languages', () => {
  const o = (languages) => ({ strip: ['articles'], languages });
  assert.equal(normalize('Los Lobos', o([es])), 'lobos');
  assert.equal(normalize('The Who', o([es])), 'the who');
  assert.equal(normalize("L'amour", o(['fr'])), 'amour');
  // Without the option, the historical list (en, fr, es, it, de) applies.
  assert.equal(normalize('Die Ärzte', { strip: ['articles'] }), 'arzte');
  assert.equal(normalize('Die Ärzte', o(['en', 'fr'])), 'die arzte');
});

test('languages: stop words are opt-in', () => {
  assert.equal(normalize('Casa de Papel', { languages: [es] }), 'casa de papel');
  assert.equal(normalize('Casa de Papel', { languages: [es], stopwords: true }), 'casa papel');
  assert.equal(normalize('The Lord of the Rings', { stopwords: true }), 'lord rings');
});

test('languages: phonetic rules come from the packs', () => {
  assert.equal(compare('bamos', 'vamos', { languages: [es], phonetic: true, threshold: 90 }).match, true);
  // English and French share one rule list: same keys as before.
  assert.equal(compare('kwin', 'Queen', { phonetic: true }).match, true);
  assert.equal(compare('kwin', 'Queen', { phonetic: true, languages: ['en', 'fr'] }).score, compare('kwin', 'Queen', { phonetic: true }).score);
});

test('languages: unknown codes and fake packs are refused', () => {
  assert.throws(() => normalize('a', { languages: ['pt'] }), /Unknown language "pt".*defineLanguage/);
  assert.throws(() => normalize('a', { languages: [{ code: 'es' }] }), /Invalid language/);
  assert.throws(() => normalize('a', { languages: [{ ...es, apiVersion: 99 }] }), /extension API 99/);
});

/* presets -------------------------------------------------------------------- */

const companies = definePreset({
  name: 'company-names',
  description: 'Company names',
  version: '1.0.0',
  options: {
    ignoreWords: ['inc', 'ltd', 'sa', 'sarl', 'gmbh'],
    replace: { '&': 'and' },
    stripPatterns: [/\bgroup(e)?\b/g],
  },
});

test('definePreset(): a custom preset is used like a built-in one', () => {
  assert.equal(companies.kind, 'preset');
  assert.ok(Object.isFrozen(companies));
  assert.equal(compare('ACME Inc.', 'acme', { preset: companies }).score, 100);
  assert.equal(compare('Smith & Sons Group', 'smith and sons', { preset: companies }).score, 100);
  // Own options still win.
  assert.equal(compare('ACME Inc.', 'acme', { preset: companies, ignoreWords: [] }).score < 100, true);
});

test('definePreset(): extends a built-in, replace tables and patterns add up', () => {
  const kpop = definePreset({
    name: 'kpop',
    extends: 'music',
    options: { replace: { bts: 'bangtan boys' }, stripPatterns: [/\bkpop\b/g] },
  });
  assert.deepEqual(kpop.options.strip, ['featuring', 'version', 'brackets', 'articles']);
  assert.equal(kpop.options.replace['&'], 'and');
  assert.equal(check('BTS', 'Bangtan Boys (feat. Halsey)', { preset: kpop }).correct, true);
  const more = definePreset({ name: 'more', extends: kpop, options: { stripPatterns: [/x/g] } });
  assert.equal(more.options.stripPatterns.length, 2);
});

test('definePreset(): a preset can bring its languages', () => {
  const songsEs = definePreset({ name: 'music-es', extends: 'music', options: { languages: ['en', es] } });
  assert.equal(check('Los Tres', 'Tres', { preset: songsEs }).correct, true);
  assert.equal(normalize('Los Tres', songsEs.options), '3');
});

test('definePreset() explains what is wrong', () => {
  assert.throws(() => definePreset({ name: 'Company Names', options: {} }), /"name" must be lower-case/);
  assert.throws(() => definePreset({ name: 'x', options: { preset: 'music' } }), /use "extends"/);
  assert.throws(() => definePreset({ name: 'x', extends: 'musique', options: {} }), /Unknown preset to extend "musique"/);
  assert.throws(() => definePreset({ name: 'x', options: { stripPatterns: ['a'] } }), /regular expressions/);
  assert.throws(() => compare('a', 'b', { preset: { name: 'x' } }), /Invalid preset/);
  assert.throws(() => compare('a', 'b', { preset: 'musique' }), /Unknown preset "musique"/);
});

test('built-in presets keep their name in the resolved options', () => {
  assert.equal(createMatcher({ preset: 'music' }).options.preset, 'music');
  assert.equal(createMatcher({ preset: companies }).options.preset, 'company-names');
});

test('saved indexes record which packs and patterns were used', () => {
  const items = ['Treinta y Dos', 'Los Lobos'];
  const saved = JSON.parse(JSON.stringify(createIndex(items, { languages: [es], preset: companies })));
  assert.ok(saved.options.includes('es@'));
  assert.ok(saved.options.includes('group'));
  assert.equal(loadIndex(items, saved, { languages: [es], preset: companies }).search('32')[0].item, 'Treinta y Dos');
  assert.throws(() => loadIndex(items, saved, { languages: ['en'], preset: companies }), /other options/);
});
