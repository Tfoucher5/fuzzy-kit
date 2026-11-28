import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dedupe, group } from '../dist/esm/index.js';

const every = { everyKey: true };

test('everyKey: each key matches its own key', () => {
  const rows = [
    { name: 'Jean Dupont', city: 'Paris' },
    { name: 'Société Générale', city: 'Paris' },
    { name: 'jean dupond', city: 'paris' },
    { name: 'Jean Dupont', city: 'Lyon' },
    { name: 'Jean Dupont' },
  ];
  // Without it, the shared city merges a person and a bank.
  assert.equal(dedupe(rows, { keys: ['name', 'city'] }).length, 1);
  assert.deepEqual(group(rows, { keys: ['name', 'city'], ...every }), [[rows[0], rows[2], rows[4]], [rows[1]], [rows[3]]]);
});

test('everyKey: empty values never make a match', () => {
  const rows = [{ id: 1, email: '' }, { id: 2, email: '' }, { id: 3, email: 'a@b.c' }, { id: 4, email: 'A@b.c' }, { id: 5 }];
  assert.deepEqual(dedupe(rows, { keys: 'email', ...every }).map((r) => r.id), [1, 2, 3, 5]);
  assert.deepEqual(group(['a', 'a', '', '!', '?'], every), [['a', 'a'], [''], ['!'], ['?']]);
});

test('everyKey: the same groups as comparing every pair', () => {
  const names = ['Hey Jude', 'hey jude!', 'Let It Be', 'let it bee', 'Yesterday', 'Yesteday', 'Help'];
  const rows = names.map((name, i) => ({ name, year: String(1960 + (i % 3)) }));
  for (const threshold of [70, 80, 90]) {
    const fast = group(rows, { keys: ['name', 'year'], threshold, ...every });
    // Reference: every pair compared, first group that fits wins.
    const slow = [];
    for (const row of rows) {
      const home = slow.find((g) => dedupe([g[0], row], { keys: ['name'], threshold }).length === 1 && dedupe([g[0].year, row.year], { threshold }).length === 1);
      if (home) home.push(row);
      else slow.push([row]);
    }
    assert.deepEqual(fast, slow, String(threshold));
  }
});

test('everyKey: --every-key on the command line', () => {
  const out = execFileSync(process.execPath, ['bin/fuzzy-toolkit.mjs', 'dedupe', '-', '-k', 'email', '--every-key'], {
    input: 'id,email\n1,\n2,\n3,a@b.c\n4,a@b.c\n',
    encoding: 'utf8',
  });
  assert.deepEqual(out.trim().split(/\r?\n/), ['id,email', '1,', '2,', '3,a@b.c']);
});
