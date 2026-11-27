import test from 'node:test';
import assert from 'node:assert/strict';
import { find, findAll } from '../dist/esm/index.js';

test('findAll: the items of a list mentioned in a text, in reading order', () => {
  const found = findAll('2 iphone 15 et un macbok air svp', ['iPhone 15', 'MacBook Air', 'iPad']);
  assert.deepEqual(found, [
    { item: 'iPhone 15', index: 0, text: 'iphone 15', start: 2, end: 11, score: 100 },
    { item: 'MacBook Air', index: 1, text: 'macbok air', start: 18, end: 28, score: 90.91 },
  ]);
  for (const f of found) assert.equal('2 iphone 15 et un macbok air svp'.slice(f.start, f.end), f.text);
  assert.deepEqual(findAll('', ['a']), []);
  assert.deepEqual(findAll('abc', []), []);
  assert.deepEqual(findAll('nothing here', ['Bohemian Rhapsody']), []);
});

test('findAll: longer names win over their parts, each item keeps its best window', () => {
  const songs = ['Bohemian Rhapsody', 'Hotel California', 'Hotel', 'California', 'Dancing Queen'];
  const text = 'play bohemian rapsody, then hotel californa or dancing queen please';
  assert.deepEqual(findAll(text, songs).map((f) => `${f.item}=${f.text}`), [
    'Bohemian Rhapsody=bohemian rapsody',
    'Hotel California=hotel californa',
    'Dancing Queen=dancing queen',
  ]);
});

test('findAll: keys, aliases, weights and threshold', () => {
  const cities = [
    { name: 'New York', aliases: ['NYC', 'Big Apple'] },
    { name: 'San Francisco', aliases: ['SF'] },
  ];
  const found = findAll('from new yrok to the big apple and san fransisco', cities, { keys: ['name', 'aliases'] });
  assert.deepEqual(found.map((f) => [f.item.name, f.key, f.text]), [
    ['New York', 'name', 'new yrok'],
    ['New York', 'aliases', 'big apple'],
    ['San Francisco', 'name', 'san fransisco'],
  ]);
  assert.deepEqual(findAll('new yrok', cities, { keys: ['name'], threshold: 95 }), []);
  const weighted = findAll('big apple', cities, { keys: [{ name: 'aliases', weight: 0.5 }] });
  assert.deepEqual(weighted, []);
  assert.throws(() => findAll('x', [{ a: 1 }]), /keys/);
});

test('findAll: a single item finds what find() finds', () => {
  const text = "je crois que c'est bohemian rapsody de queen, oui bohemian rhapsody";
  const one = find(text, 'Bohemian Rhapsody');
  assert.deepEqual(findAll(text, ['Bohemian Rhapsody']).map(({ item: _i, index: _x, ...f }) => f), one);
});

test('findAll: the parts kept cover the most text, weighted by score (brute force)', async () => {
  const { bestCover } = await import('../dist/esm/text.js');
  let seed = 17;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const value = (parts) => parts.reduce((sum, p) => sum + p.score * (p.end - p.start), 0);
  for (let round = 0; round < 300; round += 1) {
    const parts = Array.from({ length: 1 + Math.floor(random() * 9) }, (_, id) => {
      const start = Math.floor(random() * 20);
      return { id, start, end: start + 1 + Math.floor(random() * 6), score: 80 + Math.floor(random() * 21), text: '' };
    });
    let best = 0;
    for (let mask = 0; mask < 1 << parts.length; mask += 1) {
      const chosen = parts.filter((_, i) => mask & (1 << i));
      const clash = chosen.some((a, i) => chosen.some((b, j) => i < j && a.start < b.end && b.start < a.end));
      if (!clash) best = Math.max(best, value(chosen));
    }
    const kept = bestCover(parts);
    assert.equal(value(kept), best, JSON.stringify(parts));
    for (let i = 1; i < kept.length; i += 1) assert.ok(kept[i - 1].end <= kept[i].start, 'in order, no overlap');
  }
});
