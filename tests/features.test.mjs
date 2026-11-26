import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as joinPath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { check, compare, createIndex, diff, search, similarity } from '../dist/esm/index.js';

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
