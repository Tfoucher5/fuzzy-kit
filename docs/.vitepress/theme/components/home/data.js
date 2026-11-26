// Content of the home page. Every number comes from docs/guide/benchmarks.md
// (npm run bench:versus) or the README (npm run bench:real): update both together.

export const announcement = {
  label: 'New in 2.5',
  text: 'Dutch language pack, from our first community contributor',
  link: '/guide/changelog',
}

export const works = ['Node 18+', 'Every browser', 'TypeScript', 'React hook', 'CDN', 'Command line', 'MCP server']

/** Examples played by the hero demo. Scores are computed live by the library. */
export const examples = [
  { label: 'Typo', answer: 'bohemian rapsody', expected: 'Bohemian Rhapsody', why: 'One letter missing, case ignored.' },
  { label: 'Word order', answer: 'smith john', expected: 'John Smith', why: 'Word order ignored.' },
  { label: 'Accents', answer: 'beyonce', expected: 'Beyoncé', why: 'Accents ignored.' },
  { label: 'Numbers', answer: 'vingt et un', expected: '21', why: 'Numbers in words, in 6 languages.' },
  { label: 'Noise', answer: 'Imagine (Remastered 2010)', expected: 'Imagine', preset: 'music', why: 'The music preset drops the noise.' },
]

export const words = [
  { code: 'fr', text: 'vingt et un', n: '21' },
  { code: 'es', text: 'treinta y dos', n: '32' },
  { code: 'de', text: 'einundzwanzig', n: '21' },
  { code: 'it', text: 'ventitré', n: '23' },
  { code: 'nl', text: 'eenentwintig', n: '21' },
  { code: 'en', text: 'twenty one', n: '21' },
  { code: 'fr', text: 'quatre-vingt-dix', n: '90' },
  { code: 'en', text: 'the Beatles', n: 'Beatles' },
]

export const stats = [
  { n: 7, unit: '×', label: 'faster than Fuse.js on search as you type, and it finds more' },
  { n: 33, unit: '×', label: 'faster than string-similarity for "did you mean"' },
  { n: 98, unit: '%', label: 'of lines covered by tests, plus fuzz tests' },
  { n: 6, unit: '', label: 'languages for numbers in words, articles and sounds' },
]

export const benchmarks = [
  {
    key: 'search',
    label: 'Search as you type',
    sub: '300 typed queries with a typo, over 23,450 song titles. fuzzy-toolkit finds more than Fuse.js, 7 times faster.',
    metric: 'Wanted title found in the top 10',
    rows: [
      { name: 'fuzzy-toolkit', value: 82.7, time: '11.0 ms / query', me: true },
      { name: 'Fuse.js', value: 65.3, time: '81.6 ms / query' },
      { name: 'fuzzysort', value: 21.7, time: '0.8 ms / query' },
    ],
  },
  {
    key: 'dym',
    label: 'Did you mean',
    sub: '500 misspelled words against the 20,000 most common English words. The right word, 33 times faster.',
    metric: 'Right word suggested',
    rows: [
      { name: 'fuzzy-toolkit', value: 93.4, time: '0.21 s', me: true },
      { name: 'string-similarity', value: 39.0, time: '6.9 s' },
    ],
  },
  {
    key: 'acronyms',
    label: 'Acronyms',
    sub: '150 city names typed as their initials (nyc), among 151,186 cities.',
    metric: 'City found in the top 10',
    rows: [
      { name: 'fuzzy-toolkit', value: 82.0, time: '19 ms / query', me: true },
      { name: 'match-sorter', value: 59.3, time: '104 ms / query' },
    ],
  },
]

/** One tab per job. Results were checked against the library (see tests/docs-home.test.mjs). */
export const jobs = [
  { key: 'check', title: 'Grade an answer', fn: 'check', code: "check('bohemian rapsody', 'Bohemian Rhapsody')", result: "{ verdict: 'correct', score: 94.12 }" },
  { key: 'search', title: 'Search as you type', fn: 'search', code: "search('new yo', cities, { preset: 'search' })", result: 'New York (97.5), New York City (94.62)' },
  { key: 'closest', title: 'Did you mean...?', fn: 'closest', code: "closest('pyhton', ['python', 'java', 'php'])", result: "{ item: 'python', score: 83.33 }" },
  { key: 'find', title: 'Spot a name in a message', fn: 'find', code: "find(\"je crois que c'est bohemian rapsody\",\n  'Bohemian Rhapsody')", result: "'bohemian rapsody', from 19 to 35" },
  { key: 'dedupe', title: 'Clean up duplicates', fn: 'dedupe', code: "dedupe(['Beyoncé', 'beyonce', 'Adele'])", result: "['Beyoncé', 'Adele']" },
  { key: 'join', title: 'Match two lists', fn: 'join', code: "join(['Apple Inc.', 'Microsoft Corp'],\n  ['MICROSOFT CORPORATION', 'Apple'],\n  { ignoreWords: ['inc', 'corp', 'corporation'] })", result: 'each company paired with its twin' },
]

/** Real output of the CLI on this file. */
export const terminal = [
  { text: '$ cat customers.csv', kind: 'cmd' },
  { text: 'name,city', kind: 'in' },
  { text: 'ACME Inc.,Paris', kind: 'in' },
  { text: 'Acme,Paris', kind: 'in' },
  { text: 'Globex Corp,Lyon', kind: 'in' },
  { text: 'Globex Corporation,Lyon', kind: 'in' },
  { text: 'Initech,Nantes', kind: 'in' },
  { text: ' ', kind: 'in' },
  { text: '$ npx fuzzy-toolkit dedupe customers.csv -k name -i inc -i corp -i corporation', kind: 'cmd' },
  { text: 'name,city', kind: 'out' },
  { text: 'ACME Inc.,Paris', kind: 'out' },
  { text: 'Globex Corp,Lyon', kind: 'out' },
  { text: 'Initech,Nantes', kind: 'out' },
]

export const trust = [
  { title: 'Signed provenance', text: 'Every version is published from GitHub Actions with npm provenance. Check it with npm audit signatures.' },
  { title: 'Zero dependencies', text: 'Nothing else gets installed with it. CI fails if one sneaks in.' },
  { title: 'Tested hard', text: 'Golden results, 98% coverage and fuzz tests on random Unicode, on Node 18 to 24.' },
  { title: 'OpenSSF Best Practices', text: 'Passing badge, Scorecard checked weekly, CodeQL on every change.' },
]
