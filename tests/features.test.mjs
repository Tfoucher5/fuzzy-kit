import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as joinPath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { check, compare, createIndex, diff, highlight, search, similarity } from '../dist/esm/index.js';

/* substring ----------------------------------------------------------------- */

test('substring: a match may start inside a word, opt-in', () => {
  const items = ['iPhone 15', 'Phone case', 'Galaxy S24', 'Smartphone Pro', 'Belleville'];
  const names = (query, options) => search(query, items, options).map((r) => r.item);

  // Off by default and with the search preset: same results as before.
  assert.deepEqual(names('phone', { preset: 'search' }), ['Phone case', 'iPhone 15']);
  assert.equal(similarity('phone', 'Smartphone Pro'), similarity('phone', 'Smartphone Pro', { substring: false }));

  // On: inside words too, word starts still first.
  assert.deepEqual(names('phone', { preset: 'search', substring: true }), ['Phone case', 'iPhone 15', 'Smartphone Pro']);
  assert.deepEqual(names('ville', { substring: true }), ['Belleville']);
  assert.deepEqual(names('smart pro', { substring: true }), ['Smartphone Pro']);
  assert.deepEqual(createIndex(items, { substring: true }).search('phone').map((r) => r.item), ['Phone case', 'iPhone 15', 'Smartphone Pro']);
  // It turns partial matching on.
  assert.ok(similarity('phone', 'Smartphone Pro', { substring: true }) > similarity('phone', 'Smartphone Pro', { partial: true }));
  assert.ok(similarity('phone', 'Phone case', { substring: true }) > similarity('phone', 'Smartphone', { substring: true }));
  assert.equal(compare('phone', 'Smartphone', { substring: true }).scores.partial !== undefined, true);

  // What matched is highlighted inside the word.
  assert.deepEqual(search('phone', ['Smartphone Pro'], { substring: true, includeMatches: true })[0].ranges, [[5, 10]]);
  assert.deepEqual(search('ville', ['Belleville'], { substring: true, includeMatches: true })[0].ranges, [[5, 10]]);
  assert.ok(highlight('Smartphone Pro', 'phone', { substring: true }).some((s) => s.match));
});

/* phonetic ------------------------------------------------------------------ */

test('phonetic: answers spelled by ear match', () => {
  const o = { phonetic: true };
  for (const [guess, answer] of [
    ['beyonsay', 'Beyoncé'],
    ['nite', 'night'],
    ['fone', 'phone'],
    ['kwin', 'Queen'],
    ['chakira', 'Shakira'],
    ['ed shiran', 'Ed Sheeran'],
    ['anjel', 'Angèle'],
  ]) {
    assert.equal(similarity(guess, answer, o), 95, `${guess} / ${answer}`);
    assert.equal(check(guess, answer, { ...o, preset: 'music' }).correct, true, guess);
    assert.ok(similarity(guess, answer) < 95, `${guess} without phonetic`);
  }
});

test('phonetic: off by default, never beats the real spelling, short words left alone', () => {
  assert.equal(similarity('fone', 'phone'), 60);
  assert.equal(similarity('Eminem', 'eminem', { phonetic: true }), 100);
  assert.ok(similarity('air', 'her', { phonetic: true }) < 80);
  assert.ok(similarity('paris', 'tokyo', { phonetic: true }) < 30);
  const ranked = search('fone', ['phone', 'fone'], { phonetic: true });
  assert.deepEqual(ranked.map((m) => m.item), ['fone', 'phone']);
  assert.equal(compare('nite', 'night', { phonetic: true }).scores.phonetic, 95);
});

test('phonetic: works in indexes and with word order', () => {
  const index = createIndex(['Beyoncé', 'Rihanna', 'Shakira'], { phonetic: true });
  assert.equal(index.closest('beyonsay')?.item, 'Beyoncé');
  assert.equal(similarity('shiran ed', 'Ed Sheeran', { phonetic: true }), 95);
});

/* index add / remove / refresh ----------------------------------------------- */

test('index: add, remove and refresh items', () => {
  const songs = [
    { id: 1, title: 'Bohemian Rhapsody' },
    { id: 2, title: 'Hey Jude' },
  ];
  const index = createIndex(songs, { keys: 'title' });
  assert.equal(index.size, 2);

  const flowers = { id: 3, title: 'Flowers' };
  index.add(flowers, { id: 4, title: 'Get Lucky' });
  assert.equal(index.size, 4);
  assert.equal(index.closest('flowrs')?.item, flowers);
  assert.equal(index.closest('flowrs')?.index, 2);

  assert.equal(index.remove((song) => song.id === 1), 1);
  assert.equal(index.size, 3);
  assert.equal(index.closest('bohemian rhapsody'), undefined);
  // Positions follow the current list.
  assert.equal(index.closest('flowrs')?.index, 1);
  assert.deepEqual(index.items.map((s) => s.id), [2, 3, 4]);

  assert.equal(index.remove(flowers), 1);
  assert.equal(index.remove(flowers), 0);

  const jude = index.items[0];
  jude.title = 'Let It Be';
  assert.equal(index.closest('let it be'), undefined);
  assert.equal(index.refresh((s) => s === jude), 1);
  assert.equal(index.closest('let it be')?.item, jude);
  assert.equal(songs.length, 2, 'the original array is not modified');
});

/* diff ------------------------------------------------------------------------- */

test('diff: shows what turns the guess into the answer', () => {
  assert.deepEqual(diff('bohemian rapsody', 'Bohemian Rhapsody'), [
    { text: 'Bohemian R', type: 'same' },
    { text: 'h', type: 'added' },
    { text: 'apsody', type: 'same' },
  ]);
  assert.deepEqual(diff('beyonsay', 'Beyoncé'), [
    { text: 'Beyon', type: 'same' },
    { text: 'say', type: 'removed' },
    { text: 'cé', type: 'added' },
  ]);
  assert.deepEqual(diff('abc', 'abc'), [{ text: 'abc', type: 'same' }]);
  assert.deepEqual(diff('', 'abc'), [{ text: 'abc', type: 'added' }]);
  assert.deepEqual(diff('abc', ''), [{ text: 'abc', type: 'removed' }]);
  assert.deepEqual(diff('', ''), []);
  assert.deepEqual(diff('Abc', 'abc', { caseSensitive: true }), [
    { text: 'A', type: 'removed' },
    { text: 'a', type: 'added' },
    { text: 'bc', type: 'same' },
  ]);
});

test('diff: pieces rebuild both texts', () => {
  const pairs = [['stairwaytoheven', 'stairway to heaven'], ['guns n roses', "guns n' roses"], ['teh', 'the'], ['😀ab', 'a😀b']];
  for (const [a, b] of pairs) {
    const changes = diff(a, b, { caseSensitive: true, accentSensitive: true });
    assert.equal(changes.filter((c) => c.type !== 'added').map((c) => c.text).join(''), a);
    assert.equal(changes.filter((c) => c.type !== 'removed').map((c) => c.text).join(''), b);
  }
});

/* CLI ---------------------------------------------------------------------------- */

const cli = fileURLToPath(new URL('../bin/fuzzy-toolkit.mjs', import.meta.url));
const run = (args, input) => execFileSync(process.execPath, [cli, ...args], { encoding: 'utf8', input });

test('cli: dedupe, group, join and search CSV files', () => {
  const dir = mkdtempSync(joinPath(tmpdir(), 'fuzzy-toolkit-'));
  const clients = joinPath(dir, 'clients.csv');
  writeFileSync(clients, 'name;city\nJean Dupont SARL;Paris\n"Dupont; Jean";Paris\nMarie Curie;Lyon\n');
  const orders = joinPath(dir, 'orders.csv');
  writeFileSync(orders, 'client,total\njean dupont,10\nmarie curi,20\nnobody,5\n');

  assert.equal(run(['dedupe', clients, '-k', 'name', '-i', 'sarl']), 'name;city\nJean Dupont SARL;Paris\nMarie Curie;Lyon\n');
  assert.equal(
    run(['group', clients, '-i', 'sarl']),
    'group;name;city\n1;Jean Dupont SARL;Paris\n1;"Dupont; Jean";Paris\n2;Marie Curie;Lyon\n',
  );
  assert.equal(
    run(['join', orders, clients, '--left-key', 'client', '--right-key', 'name', '-i', 'sarl']),
    'client,total,name,city,score\njean dupont,10,Jean Dupont SARL,Paris,100\nmarie curi,20,Marie Curie,Lyon,90.91\nnobody,5,,,\n',
  );
  assert.equal(run(['search', 'curie marie', clients, '--limit', '1']), 'score;name;city\n100;Marie Curie;Lyon\n');
});

test('cli: text from stdin, JSON, compare and errors', () => {
  assert.equal(run(['dedupe', '-', '-p', 'music'], 'Hey Jude\nhey jude - Remastered\nLet It Be\n'), 'Hey Jude\nLet It Be\n');
  assert.deepEqual(JSON.parse(run(['dedupe', '-'], '["Paris", "paris!", "Lyon"]')), ['Paris', 'Lyon']);
  assert.equal(JSON.parse(run(['compare', 'fone', 'phone', '--phonetic', '--json'])).score, 95);
  assert.match(run(['--help']), /Usage/);
  assert.throws(() => run(['nope']), /unknown command/);
});

test('cli: --preset and --lang load extensions from files', () => {
  const dir = mkdtempSync(joinPath(tmpdir(), 'fuzzy-toolkit-'));
  const lib = new URL('../dist/esm/index.js', import.meta.url).href;
  const preset = joinPath(dir, 'companies.mjs');
  writeFileSync(preset, `import { definePreset } from '${lib}';\nexport default definePreset({ name: 'companies', options: { ignoreWords: ['sarl'] } });\n`);
  const lang = joinPath(dir, 'es.mjs');
  writeFileSync(lang, `import { defineLanguage } from '${lib}';\nexport const es = defineLanguage({ code: 'es', numbers: { units: ['cero', 'uno', 'dos'] } });\n`);
  assert.equal(JSON.parse(run(['compare', 'Dupont SARL', 'dupont', '-p', preset, '--json'])).score, 100);
  assert.equal(JSON.parse(run(['compare', 'dos', '2', '--lang', lang, '--json'])).score, 100);
  assert.equal(JSON.parse(run(['compare', 'two', '2', '--lang', `fr,${lang}`, '--json'])).score < 100, true);
  assert.throws(() => run(['compare', 'a', 'b', '-p', lang]), /does not export a preset/);
});

test('cli: map-fields renames columns to a schema', () => {
  const dir = mkdtempSync(joinPath(tmpdir(), 'fuzzy-toolkit-'));
  const file = joinPath(dir, 'export.csv');
  writeFileSync(file, 'Prénom;NOM;E-mail;Zip;Notes\nAda;Lovelace;ada@x.io;75001;hi\n');
  assert.equal(
    run(['map-fields', file, '--to', 'firstName,lastName,email,postalCode,phone']),
    'firstName;lastName;email;postalCode;phone;Notes\nAda;Lovelace;ada@x.io;75001;;hi\n',
  );
  const schema = joinPath(dir, 'schema.json');
  writeFileSync(schema, JSON.stringify({ type: 'object', properties: { email: {}, firstName: {} } }));
  assert.deepEqual(JSON.parse(run(['map-fields', file, '--to', schema, '--drop', '--json'])), [{ email: 'ada@x.io', firstName: 'Ada' }]);
  assert.throws(() => execFileSync(process.execPath, [cli, 'map-fields', file], { stdio: 'pipe' }), /needs --to/);
});

test('cli: standardize rewrites a column with the most common spelling', () => {
  const dir = mkdtempSync(joinPath(tmpdir(), 'fuzzy-toolkit-'));
  const file = joinPath(dir, 'contacts.csv');
  writeFileSync(file, 'name,city\nAda,Paris\nAlan,paris\nGrace,Pariss\nLinus,Lyon\nMarie,Paris\n');
  assert.equal(run(['standardize', file, '-k', 'city']), 'name,city\nAda,Paris\nAlan,Paris\nGrace,Paris\nLinus,Lyon\nMarie,Paris\n');
});

const runAll = (args, input) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', input });

test('cli: bad input fails clearly instead of corrupting data', () => {
  const dir = mkdtempSync(joinPath(tmpdir(), 'fuzzy-toolkit-'));
  const dup = joinPath(dir, 'dup.csv');
  writeFileSync(dup, 'name,name,city\nx,y,z\n');
  let r = runAll(['dedupe', dup]);
  assert.equal(r.status, 1);
  assert.equal(r.stdout, '');
  assert.match(r.stderr, /has duplicate column names: name\. Rename them/);

  const long = joinPath(dir, 'long.csv');
  writeFileSync(long, 'name,city\na,b,c\nd,e\nf,g,h,i\n');
  r = runAll(['dedupe', long]);
  assert.equal(r.status, 0);
  assert.equal(r.stdout, 'name,city\na,b\nd,e\nf,g\n');
  assert.match(r.stderr, /warning: 2 rows of ".*long\.csv" have more cells than the header; the extra cells were left out\n$/);

  const empty = joinPath(dir, 'empty.csv');
  writeFileSync(empty, '');
  r = runAll(['dedupe', empty]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /"[^"]*empty\.csv" is empty/);
  assert.doesNotMatch(r.stderr, /undefined/);
});

test('cli: --version, unknown preset or language, search hint', () => {
  const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(run(['--version']), `${version}\n`);
  assert.equal(run(['-v']), `${version}\n`);

  let r = runAll(['compare', 'a', 'b', '-p', 'nope']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /unknown preset "nope"\. Built-in: music, search, strict;/);
  assert.doesNotMatch(r.stderr, /cli\.mjs|imported from/);
  r = runAll(['compare', 'a', 'b', '--lang', 'nope']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /unknown language "nope"\. Built-in: en, fr, es, de, it, nl;/);

  const dir = mkdtempSync(joinPath(tmpdir(), 'fuzzy-toolkit-'));
  const songs = joinPath(dir, 'songs.csv');
  writeFileSync(songs, 'title\nBohemian Rhapsody\nLet It Be\n');
  r = runAll(['search', 'bohemian', songs]);
  assert.equal(r.stdout, 'score,title\n');
  assert.equal(r.stderr, 'fuzzy-toolkit: no match; for search-as-you-type try -p search\n');
  r = runAll(['search', 'bohemian', songs, '-p', 'search']);
  assert.equal(r.stdout, 'score,title\n94.71,Bohemian Rhapsody\n');
  assert.equal(r.stderr, '');
  assert.match(run(['--help']), /add -p search/);
});

test('cli: new-pack without a name exits 1 with the usage', () => {
  for (const args of [['new-pack'], ['new-pack', 'language']]) {
    const r = runAll(args);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Usage/);
    assert.doesNotMatch(r.stderr, /undefined/);
  }
  assert.equal(runAll(['new-pack', '--help']).status, 0);
});

test('cli: a reader that closes the pipe early (| head) is no error', async () => {
  const dir = mkdtempSync(joinPath(tmpdir(), 'fuzzy-toolkit-'));
  const big = joinPath(dir, 'big.csv');
  writeFileSync(big, `name\n${Array.from({ length: 20000 }, (_, i) => `name${i}`).join('\n')}\n`);
  const child = spawn(process.execPath, [cli, 'group', big, '-k', 'name']);
  let stderr = '';
  child.stderr.on('data', (chunk) => (stderr += chunk));
  child.stdout.once('data', () => child.stdout.destroy());
  const status = await new Promise((done) => child.on('close', done));
  assert.equal(stderr, '');
  assert.equal(status, 0);
});
