import test from 'node:test';
import assert from 'node:assert/strict';
import RealFuse from 'fuse.js';
import Fuse from '../dist/esm/compat/fuse.js';

const books = [
  { title: "Old Man's War", author: { firstName: 'John', lastName: 'Scalzi' }, tags: ['scifi'] },
  { title: 'The Lock Artist', author: { firstName: 'Steve', lastName: 'Hamilton' }, tags: ['thriller'] },
  { title: 'HTML5', author: { firstName: 'Remy', lastName: 'Sharp' }, tags: ['web'] },
  { title: 'Right Ho Jeeves', author: { firstName: 'P.D', lastName: 'Woodhouse' }, tags: ['humor'] },
];

test('fuse: same result shape as fuse.js', () => {
  const options = { keys: ['title', 'author.lastName'], includeScore: true, includeMatches: true };
  const ours = new Fuse(books, options).search('scalzi')[0];
  const theirs = new RealFuse(books, options).search('scalzi')[0];
  assert.deepEqual(Object.keys(ours).sort(), Object.keys(theirs).sort());
  assert.equal(ours.item, theirs.item);
  assert.equal(ours.refIndex, theirs.refIndex);
  assert.deepEqual(Object.keys(ours.matches[0]).sort(), Object.keys(theirs.matches[0]).sort());
  assert.equal(ours.matches[0].key, 'author.lastName');
  // Fuse's direction: 0 is perfect, 1 nothing.
  assert.ok(ours.score >= 0 && ours.score < 0.1);
});

test('fuse: strings, typos, limit, no options', () => {
  const fuse = new Fuse(['Bohemian Rhapsody', 'Stairway to Heaven', 'Hotel California', 'iPhone 15']);
  assert.deepEqual(fuse.search('bohemain rapsody'), [{ item: 'Bohemian Rhapsody', refIndex: 0 }]);
  assert.equal(fuse.search('phone')[0].item, 'iPhone 15');
  assert.deepEqual(fuse.search(''), []);
  assert.equal(new Fuse(['abc', 'abd', 'abe']).search('ab', { limit: 2 }).length, 2);
});

test('fuse: keys as paths, arrays and weights', () => {
  assert.equal(new Fuse(books, { keys: [['author', 'lastName']] }).search('hamilton')[0].refIndex, 1);
  const weighted = new Fuse(
    [{ a: 'red apple', b: 'banana' }, { a: 'banana', b: 'red apple' }],
    { keys: [{ name: 'a', weight: 3 }, { name: 'b', weight: 1 }], includeScore: true },
  ).search('red apple');
  assert.equal(weighted[0].refIndex, 0);
  assert.ok(weighted[0].score < (weighted[1]?.score ?? 1));
});

test('fuse: threshold, sorting, case and accents', () => {
  const list = ['color', 'colour', 'cooler'];
  assert.deepEqual(new Fuse(list, { threshold: 0 }).search('color').map((r) => r.item), ['color']);
  const all = new Fuse(list, { threshold: 1, shouldSort: false }).search('color').map((r) => r.refIndex);
  assert.deepEqual(all, [...all].sort((a, b) => a - b));
  assert.equal(new Fuse(['Molière'], { threshold: 0, ignoreDiacritics: true }).search('moliere').length, 1);
  assert.equal(new Fuse(['Molière'], { threshold: 0 }).search('moliere').length, 0);
  assert.equal(new Fuse(['Paris'], { threshold: 0, isCaseSensitive: true }).search('paris').length, 0);
});

test('fuse: matches use inclusive ends and minMatchCharLength', () => {
  const [hit] = new Fuse(['Hotel California'], { includeMatches: true }).search('hotel');
  assert.deepEqual(hit.matches[0].indices, [[0, 4]]);
  assert.equal(hit.matches[0].value, 'Hotel California');
  const [short] = new Fuse(['Hotel California'], { includeMatches: true, minMatchCharLength: 6 }).search('hotel');
  assert.deepEqual(short.matches, []);
});

test('fuse: add, remove, removeAt, setCollection', () => {
  const fuse = new Fuse(['Paris', 'Lyon']);
  fuse.add('Marseille');
  assert.equal(fuse.search('marseile')[0].refIndex, 2);
  assert.deepEqual(fuse.remove((doc) => doc === 'Paris'), ['Paris']);
  assert.equal(fuse.search('lyon')[0].refIndex, 0);
  assert.equal(fuse.removeAt(0), 'Lyon');
  assert.deepEqual(fuse.search('lyon'), []);
  fuse.setCollection(['Nantes']);
  assert.equal(fuse.search('nante')[0].item, 'Nantes');
});

test('fuse: saved index round-trip, and a stale one is rebuilt', () => {
  const options = { keys: ['title'] };
  const saved = JSON.parse(JSON.stringify(new Fuse(books, options).getIndex()));
  const fuse = new Fuse(books, options, Fuse.parseIndex(saved));
  assert.equal(fuse.search('lock artist')[0].refIndex, 1);
  const prebuilt = Fuse.createIndex(['title'], books);
  assert.equal(new Fuse(books, options, prebuilt).search('html5')[0].refIndex, 2);
  // Index built for other items: rebuilt instead of failing.
  assert.equal(new Fuse(['Nantes'], {}, Fuse.parseIndex(saved)).search('nantes')[0].item, 'Nantes');
});

test('fuse: logical queries are refused, unsupported options warned about', () => {
  assert.throws(() => new Fuse(books, { keys: ['title'] }).search({ $and: [{ title: 'old' }] }), /only string queries/);
  const warnings = [];
  const warn = console.warn;
  console.warn = (m) => warnings.push(m);
  try {
    new Fuse(books, { keys: ['title'], useExtendedSearch: true });
  } finally {
    console.warn = warn;
  }
  assert.match(warnings.join('\n'), /useExtendedSearch/);
});
