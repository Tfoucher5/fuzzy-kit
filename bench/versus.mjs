// Speed and accuracy against popular alternatives, on real data.
// Run with `npm run bench:versus` (downloads the datasets once, like bench:real).
//
// Every library gets the same inputs; times are the median of 7 runs after a
// warm-up. Accuracy is measured on the same queries for search libraries.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import stringSimilarity from 'string-similarity';
import Fuse from 'fuse.js';
import { distance as fastestDistance } from 'fastest-levenshtein';
import fuzzysort from 'fuzzysort';
import { matchSorter } from 'match-sorter';
import * as kit from '../dist/esm/index.js';
import kitCompat from '../dist/esm/compat/string-similarity.js';

const DATA = new URL('./.data/', import.meta.url);
const SOURCES = {
  'spotify.csv':
    'https://raw.githubusercontent.com/rfordatascience/tidytuesday/master/data/2020/2020-01-21/spotify_songs.csv',
  'count_1w.txt': 'https://raw.githubusercontent.com/norvig/pytudes/main/data/text/count_1w.txt',
  'cities.json': 'https://raw.githubusercontent.com/lutangar/cities.json/master/cities.json',
};

async function load(name) {
  const file = new URL(name, DATA);
  if (!existsSync(file)) {
    mkdirSync(DATA, { recursive: true });
    process.stdout.write(`Downloading ${name}... `);
    const response = await fetch(SOURCES[name]);
    if (!response.ok) throw new Error(`${response.status} for ${SOURCES[name]}`);
    writeFileSync(file, Buffer.from(await response.arrayBuffer()));
    console.log('done');
  }
  return readFileSync(file, 'utf8');
}

function parseCsv(text) {
  const out = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); out.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); out.push(row); }
  return out;
}

let seed = 1234;
const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const typo = (s) => {
  if (s.length < 4) return s;
  const i = 1 + Math.floor(random() * (s.length - 2));
  const r = random();
  if (r < 0.33) return s.slice(0, i) + s.slice(i + 1);
  if (r < 0.66) return s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2);
  return s.slice(0, i) + 'e' + s.slice(i + 1);
};

function median(fn) {
  fn();
  const times = [];
  for (let i = 0; i < 7; i += 1) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }
  return times.sort((a, b) => a - b)[3];
}

const rows = [];
function section(title) {
  console.log(`\n${title}`);
  rows.push([title]);
}
function line(name, ms, extra = '') {
  const text = `  ${name.padEnd(46)} ${ms.toFixed(1).padStart(8)} ms  ${extra}`;
  console.log(text);
  rows.push([name, ms, extra]);
}

const [header, ...lines] = parseCsv(await load('spotify.csv'));
const titleCol = header.indexOf('track_name');
const titles = [...new Set(lines.map((l) => l[titleCol]).filter(Boolean))];
const words = (await load('count_1w.txt')).split('\n').map((l) => l.split('\t')[0]).filter(Boolean).slice(0, 20000);
const pairs = titles.slice(0, 20000).map((t) => [t, typo(t)]);

/* 1. string-similarity --------------------------------------------------- */
section(`string-similarity API (${pairs.length} title pairs, 1,000 findBestMatch over 2,000 titles)`);
const same = pairs.every(([a, b]) => kitCompat.compareTwoStrings(a, b) === stringSimilarity.compareTwoStrings(a, b));
const ss1 = median(() => { for (const [a, b] of pairs) stringSimilarity.compareTwoStrings(a, b); });
const kit1 = median(() => { for (const [a, b] of pairs) kitCompat.compareTwoStrings(a, b); });
line('string-similarity compareTwoStrings', ss1);
line('fuzzy-toolkit/string-similarity', kit1, `x${(ss1 / kit1).toFixed(1)}, ${same ? 'identical results' : 'RESULTS DIFFER'}`);
const targets = titles.slice(0, 2000);
const queries = titles.slice(5000, 6000).map(typo);
const ss2 = median(() => { for (const q of queries) stringSimilarity.findBestMatch(q, targets); });
const kit2 = median(() => { for (const q of queries) kitCompat.findBestMatch(q, targets); });
line('string-similarity findBestMatch', ss2);
line('fuzzy-toolkit/string-similarity findBestMatch', kit2, `x${(ss2 / kit2).toFixed(1)}`);

/* 2. Levenshtein ---------------------------------------------------------- */
section(`Levenshtein distance (${pairs.length} title pairs + ${words.length} word pairs)`);
const wordPairs = words.map((w, i) => [w, words[(i + 1) % words.length]]);
const fl = median(() => { for (const [a, b] of pairs) fastestDistance(a, b); for (const [a, b] of wordPairs) fastestDistance(a, b); });
const kl = median(() => { for (const [a, b] of pairs) kit.levenshtein(a, b); for (const [a, b] of wordPairs) kit.levenshtein(a, b); });
line('fastest-levenshtein', fl);
line('fuzzy-toolkit levenshtein', kl, `x${(fl / kl).toFixed(1)}`);
const sentence = () => Array.from({ length: 20 + Math.floor(random() * 30) }, () => words[Math.floor(random() * 2000)]).join(' ');
const longPairs = Array.from({ length: 2000 }, () => { const s = sentence(); return [s, typo(typo(s))]; });
const fl2 = median(() => { for (const [a, b] of longPairs) fastestDistance(a, b); });
const kl2 = median(() => { for (const [a, b] of longPairs) kit.levenshtein(a, b); });
const kd2 = median(() => { for (const [a, b] of longPairs) kit.damerau(a, b); });
line('fastest-levenshtein, 2,000 sentences (100-400 chars)', fl2);
line('fuzzy-toolkit levenshtein, same', kl2, `x${(fl2 / kl2).toFixed(1)}`);
line('fuzzy-toolkit damerau, same', kd2);

/* 3. Did you mean ---------------------------------------------------------- */
section(`"Did you mean": 500 misspelled words against the ${words.length} most common English words`);
const misspelled = words.slice(0, 5000).filter((w) => w.length >= 5).slice(0, 500).map((w) => ({ w, q: typo(w) }));
const accuracy = (found) => `${((100 * misspelled.filter((m, i) => found[i] === m.w).length) / misspelled.length).toFixed(1)} % right`;
let found;
const ssBest = median(() => { found = misspelled.map((m) => stringSimilarity.findBestMatch(m.q, words).bestMatch.target); });
line('string-similarity findBestMatch', ssBest, accuracy(found));
const dict = kit.createIndex(words);
const kitBest = median(() => { found = misspelled.map((m) => dict.closest(m.q)?.item); });
line('fuzzy-toolkit index.closest', kitBest, `${accuracy(found)}, x${(ssBest / kitBest).toFixed(1)}`);

/* 4. Search as you type ------------------------------------------------------ */
section(`Search: 300 typed queries (a prefix with a typo) over ${titles.length} song titles, top 10`);
const searches = Array.from({ length: 300 }, () => {
  const title = titles[Math.floor(random() * titles.length)];
  const prefix = title.toLowerCase().split(' ').slice(0, 2).join(' ');
  return { title, q: typo(prefix.slice(0, Math.max(5, Math.ceil(prefix.length * 0.8)))) };
});
const hit = (results) => `${((100 * searches.filter((s, i) => results[i].includes(s.title)).length) / searches.length).toFixed(1)} % found`;
let results;
const fuse = new Fuse(titles);
const fuseMs = median(() => { results = searches.map((s) => fuse.search(s.q, { limit: 10 }).map((r) => r.item)); });
line('Fuse.js', fuseMs / searches.length, hit(results));
const prepared = titles.map((t) => fuzzysort.prepare(t));
const fzMs = median(() => { results = searches.map((s) => fuzzysort.go(s.q, prepared, { limit: 10 }).map((r) => r.target)); });
line('fuzzysort', fzMs / searches.length, hit(results));
const index = kit.createIndex(titles, { preset: 'search' });
const kitMs = median(() => { results = searches.map((s) => index.search(s.q, { limit: 10 }).map((r) => r.item)); });
line('fuzzy-toolkit index.search (preset search)', kitMs / searches.length, hit(results));
console.log('  (times per query)');

/* 5. Acronyms ---------------------------------------------------------------- */
const cities = [...new Set(JSON.parse(await load('cities.json')).map((c) => c.name))];
const longNames = cities.filter((c) => kit.normalize(c).split(' ').length >= 3);
const acronyms = Array.from({ length: 150 }, () => {
  const name = longNames[Math.floor(random() * longNames.length)];
  return { name, q: kit.normalize(name).split(' ').map((w) => w[0]).join('') };
});
section(`Acronyms: 150 city names of 3+ words typed as initials ("nyc"), ${cities.length} cities, top 10`);
const found10 = (results) => `${((100 * acronyms.filter((a, i) => results[i].includes(a.name)).length) / acronyms.length).toFixed(1)} % found`;
const msMs = median(() => { results = acronyms.map((a) => matchSorter(cities, a.q).slice(0, 10)); });
line('match-sorter', msMs / acronyms.length, found10(results));
const cityIndex = kit.createIndex(cities, { preset: 'search' });
const acMs = median(() => { results = acronyms.map((a) => cityIndex.search(a.q, { limit: 10 }).map((r) => r.item)); });
line('fuzzy-toolkit index.search (preset search)', acMs / acronyms.length, found10(results));
console.log('  (times per query)');

/* 6. Dedupe ----------------------------------------------------------------- */
section('Dedupe song titles');
const sample = titles.slice(0, 5000);
const dd = median(() => kit.dedupe(sample));
line('fuzzy-toolkit dedupe, 5,000 titles', dd, `${kit.dedupe(sample).length} unique`);
const big = titles.slice(0, 20000);
const fp = median(() => kit.dedupe(big, { method: 'fingerprint' }));
line("fuzzy-toolkit dedupe { method: 'fingerprint' }, 20,000", fp, `${kit.dedupe(big, { method: 'fingerprint' }).length} unique`);

/* 7. Saved index -------------------------------------------------------------- */
section(`Index of ${cities.length} cities: build vs load from JSON`);
const saved = JSON.parse(JSON.stringify(cityIndex));
const fuseBuild = median(() => Fuse.createIndex([], cities));
line('Fuse.js createIndex', fuseBuild);
line('fuzzy-toolkit createIndex', median(() => kit.createIndex(cities, { preset: 'search' })));
line('fuzzy-toolkit loadIndex', median(() => kit.loadIndex(cities, saved, { preset: 'search' })));

console.log(`\nNode ${process.version}, ${process.platform} ${process.arch}`);
if (process.argv.includes('--json')) writeFileSync(new URL('./versus.json', import.meta.url), JSON.stringify(rows, null, 2));
