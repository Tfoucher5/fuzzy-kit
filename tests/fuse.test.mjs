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

test('fuse: extended search, the same items as fuse.js', () => {
  const list = [
    { title: 'Old Man War', tags: ['scifi'] },
    { title: 'The Lock Artist', tags: ['thriller'] },
    { title: 'HTML5 for beginners', tags: ['web'] },
    { title: 'JavaScript: The Good Parts', tags: ['web', 'js'] },
    { title: 'Learning Python', tags: ['python'] },
    { title: 'Ruby on Rails', tags: ['web', 'ruby'] },
  ];
  const options = { keys: ['title'], useExtendedSearch: true, threshold: 0.3 };
  const ours = new Fuse(list, options);
  const theirs = new RealFuse(list, options);
  const ids = (results) => results.map((r) => r.refIndex).sort();
  for (const query of ["'the", '=Ruby on Rails', '^Old', 'Parts$', '!the', '!^Old', '!Rails$', "^java 'good", "'python | 'ruby", '="Ruby on Rails"', "'The !Lock"]) {
    assert.deepEqual(ids(ours.search(query)), ids(theirs.search(query)), query);
  }
  // Fuzzy words still forgive typos.
  assert.deepEqual(ids(ours.search('pyhton')), [4]);
  assert.deepEqual(ours.search("'xyz"), []);
  // Exact matches report where they are.
  const [hit] = new Fuse(list, { ...options, includeMatches: true, includeScore: true }).search('^HTML');
  assert.deepEqual(hit.matches, [{ indices: [[0, 3]], value: 'HTML5 for beginners', key: 'title' }]);
  assert.equal(hit.score, 0);
  // Strings without keys, and case sensitivity.
  const fruits = ['Apple', 'apple pie'];
  assert.deepEqual(ids(new Fuse(fruits, { useExtendedSearch: true }).search('=apple')), ids(new RealFuse(fruits, { useExtendedSearch: true }).search('=apple')));
  assert.deepEqual(new Fuse(['Apple', 'apple'], { useExtendedSearch: true, isCaseSensitive: true }).search('=apple').map((r) => r.item), ['apple']);
});

test('fuse: logical queries, the same items as fuse.js', () => {
  const options = { keys: ['title', 'author.lastName', 'tags'], useExtendedSearch: true };
  const ours = new Fuse(books, options);
  const theirs = new RealFuse(books, options);
  const ids = (results) => results.map((r) => r.refIndex).sort();
  for (const query of [
    { $and: [{ title: "'old" }, { 'author.lastName': '^scal' }] },
    { $or: [{ title: '^html' }, { tags: '=humor' }] },
    { $and: [{ $path: ['author', 'lastName'], $val: "'ham" }] },
    { title: "'the", tags: '=thriller' },
  ]) {
    assert.deepEqual(ids(ours.search(query)), ids(theirs.search(query)), JSON.stringify(query));
  }
  // Without extended search, a leaf is fuzzy, on its key only.
  const fuzzy = new Fuse(books, { keys: ['title', 'author.lastName'] });
  assert.deepEqual(fuzzy.search({ 'author.lastName': 'hamiltn' }).map((r) => r.refIndex), [1]);
  assert.deepEqual(fuzzy.search({ title: 'hamilton' }), []);
  assert.throws(() => fuzzy.search({ year: '2001' }), /not one of the keys/);
  assert.throws(() => fuzzy.search({ title: 1 }), /must be a string/);
  assert.throws(() => fuzzy.search(42), /string or a logical query/);
});

test('fuse: getFn and sortFn', () => {
  const people = [{ name: { first: 'Ada', last: 'Lovelace' } }, { name: { first: 'Alan', last: 'Turing' } }];
  const byFn = new Fuse(people, { keys: [{ name: 'full', getFn: (p) => `${p.name.first} ${p.name.last}` }], includeMatches: true });
  const [hit] = byFn.search('alan turng');
  assert.equal(hit.refIndex, 1);
  assert.equal(hit.item, people[1]);
  assert.equal(hit.matches[0].key, 'full');
  const global = new Fuse(people, { keys: ['name'], getFn: (p, path) => (path[0] === 'name' ? p.name.last : '') });
  assert.equal(global.search('lovelace')[0].item, people[0]);
  global.add({ name: { first: 'Grace', last: 'Hopper' } });
  assert.equal(global.search('hoper')[0].refIndex, 2);
  assert.deepEqual(global.remove((p) => p.name.first === 'Ada').map((p) => p.name.last), ['Lovelace']);
  assert.equal(global.search('hopper')[0].refIndex, 1);

  const reversed = new Fuse(['abc', 'abd', 'abe'], { sortFn: (a, b) => b.idx - a.idx });
  assert.deepEqual(reversed.search('ab').map((r) => r.item), ['abe', 'abd', 'abc']);
  assert.deepEqual(reversed.search('ab', { limit: 1 }).map((r) => r.item), ['abe']);
});

test('fuse: unsupported options are warned about', () => {
  const warnings = [];
  const warn = console.warn;
  console.warn = (m) => warnings.push(m);
  try {
    new Fuse(books, { keys: ['title'], useTokenSearch: true });
  } finally {
    console.warn = warn;
  }
  assert.match(warnings.join('\n'), /useTokenSearch/);
});

test('fuse: limit with shouldSort false keeps the first matches of the list; limit 0 gives none, like fuse.js', () => {
  const list = ['applx', 'apple', 'appla'];
  for (const options of [{ shouldSort: false }, {}]) {
    for (const limit of [0, 1, 2]) {
      const ours = new Fuse(list, options).search('apple', { limit }).map((r) => r.refIndex);
      const theirs = new RealFuse(list, options).search('apple', { limit }).map((r) => r.refIndex);
      if (options.shouldSort === false || limit === 0) assert.deepEqual(ours, theirs, JSON.stringify({ options, limit }));
      else assert.equal(ours.length, theirs.length);
    }
  }
});
