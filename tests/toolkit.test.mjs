import test from 'node:test';
import assert from 'node:assert/strict';
import { closest, compare, cosine, damerau, dedupe, dice, group, hamming, isMatch, jaccard, jaro, join, lcs, levenshtein, overlap, ratcliffObershelp, search, similarity, tversky } from '../dist/esm/index.js';
import stringSimilarity, { compareTwoStrings, findBestMatch } from '../dist/esm/compat/string-similarity.js';

/* metrics -------------------------------------------------------------------- */

test('metrics: dice, jaccard, cosine, hamming, lcs', () => {
  assert.equal(dice('healed', 'sealed'), 0.8);
  assert.equal(dice('a', 'a'), 1);
  assert.equal(jaccard('night', 'nacht'), 1 / 7);
  assert.equal(jaccard('abc', 'abc'), 1);
  assert.equal(jaccard('', ''), 1);
  assert.equal(jaccard('ab', 'ab', 3), 1);
  assert.equal(cosine('aaaa', 'aaa'), 1);
  assert.equal(cosine('abc', ''), 0);
  assert.equal(hamming('karolin', 'kathrin'), 3);
  assert.throws(() => hamming('a', 'ab'), RangeError);
  assert.equal(lcs('ABCBDAB', 'BDCABA'), 4);
  assert.equal(lcs('', 'abc'), 0);
  assert.throws(() => jaccard('a', 'b', 0), RangeError);
});

/* string-similarity compatibility -------------------------------------------- */

test('string-similarity: same results as the original package', () => {
  for (const [a, b, expected] of [
    ['french', 'quebec', 0],
    ['france', 'france', 1],
    ['fRaNce', 'france', 0.2],
    ['healed', 'sealed', 0.8],
    ['web applications', 'applications of the web', 0.7878787878787878],
    ['this will have a typo somewhere', 'this will huve a typo somewhere', 0.92],
    ['Olive-green table for sale, in extremely good condition.', 'For sale: table in very good  condition, olive green in colour.', 0.6060606060606061],
    ['Olive-green table for sale, in extremely good condition.', 'For sale: green Subaru Impreza, 210,000 miles', 0.2558139534883721],
    ['Olive-green table for sale, in extremely good condition.', 'Wanted: mountain bike with at least 21 gears.', 0.1411764705882353],
    ['this has one extra word', 'this has one word', 0.7741935483870968],
    ['a', 'b', 0],
    ['', '', 1],
    ['a', '', 0],
    ['apple event', 'apple    event', 1],
    ['iphone', 'iphone x', 0.9090909090909091],
  ]) {
    assert.equal(compareTwoStrings(a, b), expected, `${a} / ${b}`);
  }
  const result = findBestMatch('healed', ['edward', 'sealed', 'theatre']);
  assert.deepEqual(result.bestMatch, { target: 'sealed', rating: 0.8 });
  assert.equal(result.bestMatchIndex, 1);
  assert.deepEqual(result.ratings.map((r) => r.target), ['edward', 'sealed', 'theatre']);
  assert.equal(findBestMatch('a', ['b', 'c']).bestMatchIndex, 0, 'first one on a tie');
  assert.equal(stringSimilarity.compareTwoStrings, compareTwoStrings);
  assert.throws(() => findBestMatch('a', []), /Bad arguments/);
  assert.throws(() => findBestMatch('a', [1]), /Bad arguments/);
});

/* nested keys and match ranges ----------------------------------------------- */

const songs = [
  { title: 'Bohemian Rhapsody', artist: { name: 'Queen' }, tags: [{ label: 'rock' }, { label: 'opera' }] },
  { title: 'Stairway to Heaven', artist: { name: 'Led Zeppelin' }, tags: [{ label: 'folk' }] },
];

test('keys: dotted paths read nested properties and arrays', () => {
  assert.equal(closest('queen', songs, { keys: 'artist.name' })?.item, songs[0]);
  assert.equal(closest('opera', songs, { keys: ['tags.label'] })?.item, songs[0]);
  assert.equal(search('led zepelin', songs, { keys: ['title', 'artist.name'] }).length, 1);
  // A property whose name contains a dot still wins.
  assert.equal(closest('x', [{ 'a.b': 'x' }], { keys: ['a.b'] })?.score, 100);
  assert.equal(closest('x', [{ a: null }], { keys: ['a.b'] }), undefined);
});

test('includeMatches: ranges to highlight and the key that matched', () => {
  const [hit] = search('zeppelin', songs, { keys: ['title', 'artist.name'], partial: true, includeMatches: true });
  assert.equal(hit.key, 'artist.name');
  assert.deepEqual(hit.ranges, [[4, 12]]);
  assert.equal(hit.text.slice(...hit.ranges[0]), 'Zeppelin');
  const [prefix] = search('stair', ['Stairway to Heaven'], { preset: 'search', includeMatches: true });
  assert.equal(prefix.text.slice(...prefix.ranges[0]), 'Stair');
  // Off by default: results keep their v2.1 shape.
  assert.deepEqual(Object.keys(search('queen', songs, { keys: 'artist.name' })[0]), ['item', 'score', 'index', 'text']);
});

/* fast dedupe / join: same results as comparing every pair ------------------- */

function bruteGroup(items, options) {
  const groups = [];
  for (const item of items) {
    const home = groups.find((g) => isMatch(item, g[0], options));
    if (home) home.push(item);
    else groups.push([item]);
  }
  return groups;
}

test('group/dedupe/join: candidate filtering never changes the result', () => {
  const words = ['love', 'night', 'dance', 'moon', 'river', 'fire', 'dream', 'heart', 'light', 'blue', 'deux', 'two', '2'];
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = () => words[Math.floor(random() * words.length)];
  const typo = (s) => {
    const i = Math.floor(random() * s.length);
    return random() < 0.5 ? s.slice(0, i) + s.slice(i + 1) : s.slice(0, i) + 'x' + s.slice(i);
  };
  const items = Array.from({ length: 400 }, () => {
    const base = Array.from({ length: 1 + Math.floor(random() * 3) }, pick).join(random() < 0.2 ? '' : ' ');
    return random() < 0.4 ? typo(base) : base;
  });
  items.push('', '  ', '!!');
  for (const options of [
    {},
    { threshold: 90 },
    { threshold: 60 },
    { preset: 'music' },
    { preset: 'strict' },
    { algorithm: 'levenshtein', threshold: 70 },
    { algorithm: 'tokenSort' },
    { phonetic: true },
    { preset: 'search' },
    { algorithm: 'jaroWinkler', threshold: 85 },
  ]) {
    assert.deepEqual(group(items, options), bruteGroup(items, options), JSON.stringify(options));
  }
  assert.deepEqual(dedupe(items), bruteGroup(items, {}).map((g) => g[0]));

  const right = items.slice(0, 200);
  const rows = join(items.slice(200), right);
  for (const row of rows) {
    const scores = right.map((r) => similarity(row.item, r));
    const best = Math.max(...scores);
    if (best >= 80) assert.equal(row.match?.score, best, row.item);
    else assert.equal(row.match, undefined, row.item);
  }
});

test('string-similarity: identical to the original on random input', async () => {
  const original = (await import('string-similarity')).default;
  let seed = 11;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const alphabet = 'aabbcdeé  \tÀß日本😀';
  const text = () => Array.from({ length: Math.floor(random() * 14) }, () => alphabet[Math.floor(random() * alphabet.length)]).join('');
  for (let i = 0; i < 3000; i += 1) {
    const a = text();
    const b = text();
    assert.equal(compareTwoStrings(a, b), original.compareTwoStrings(a, b), JSON.stringify([a, b]));
  }
  const targets = Array.from({ length: 50 }, text);
  for (let i = 0; i < 50; i += 1) {
    const q = text();
    assert.deepEqual(findBestMatch(q, targets), original.findBestMatch(q, targets));
  }
});

/* distances and more metrics ------------------------------------------------- */

function referenceDistance(a, b, transpositions) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= b.length; j += 1) d[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (transpositions && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

test('levenshtein/damerau: exact on long texts (blocked bit-parallel)', () => {
  let seed = 3;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const text = (n) => Array.from({ length: n }, () => 'abcx '[Math.floor(random() * 5)]).join('');
  const mutate = (s) => {
    for (let k = 0; k < 1 + random() * 8; k += 1) {
      const i = Math.floor(random() * (s.length - 1));
      const r = random();
      s = r < 0.4 ? s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2) : r < 0.7 ? s.slice(0, i) + s.slice(i + 1) : s.slice(0, i) + 'z' + s.slice(i);
    }
    return s;
  };
  for (let t = 0; t < 400; t += 1) {
    const a = text(20 + Math.floor(random() * 120));
    const b = random() < 0.7 ? mutate(a) : text(Math.floor(random() * 140));
    assert.equal(levenshtein(a, b), referenceDistance(a, b, false), `lev ${a} / ${b}`);
    assert.equal(damerau(a, b), referenceDistance(a, b, true), `osa ${a} / ${b}`);
  }
});

test('levenshtein/damerau: max stops early and returns max + 1', () => {
  assert.equal(levenshtein('kitten', 'sitting', { max: 5 }), 3);
  assert.equal(levenshtein('kitten', 'sitting', { max: 2 }), 3);
  assert.equal(levenshtein('a', 'abcdef', { max: 1 }), 2);
  assert.equal(damerau('teh', 'the', { max: 0 }), 1);
  assert.equal(damerau('abc', 'xyz', { max: 1 }), 2);
  assert.equal(levenshtein('same', 'same', { max: 0 }), 0);
});

test('metrics: jaro, overlap, tversky, ratcliffObershelp', () => {
  assert.equal(jaro('martha', 'marhta').toFixed(4), '0.9444');
  assert.equal(overlap('york', 'new york'), 1);
  assert.equal(tversky('york', 'new york', { alpha: 1, beta: 0 }), 1);
  assert.equal(tversky('night', 'nacht'), jaccard('night', 'nacht'));
  // Same as Python: difflib.SequenceMatcher(None, a, b, autojunk=False).ratio()
  assert.equal(ratcliffObershelp('WIKIMEDIA', 'WIKIMANIA'), 7 / 9);
  assert.equal(ratcliffObershelp('GESTALT PATTERN MATCHING', 'GESTALT PRACTICE'), 0.6);
  assert.equal(ratcliffObershelp('', ''), 1);
});

/* acronyms ------------------------------------------------------------------ */

test('acronyms: initials match, off by default, on with the search preset', () => {
  assert.equal(similarity('nyc', 'New York City', { acronyms: true }), 90);
  assert.equal(similarity('nyx', 'New York City', { acronyms: true }), 80);
  assert.ok(similarity('nyc', 'New York City') < 50);
  assert.equal(compare('nyc', 'New York City', { acronyms: true }).scores.acronym, 90);
  const [hit] = search('nyc', ['Nice', 'Nyack', 'New York City'], { preset: 'search', includeMatches: true });
  assert.equal(hit.item, 'New York City');
  assert.deepEqual(hit.ranges.map((r) => hit.text.slice(...r)), ['N', 'Y', 'C']);
  // A real match still ranks first.
  assert.equal(search('gs', ['git status', 'gs'], { preset: 'search' })[0].item, 'gs');
});
