// Developer warnings for likely mistakes that still run (an unknown option, a
// 0-1 threshold, a key no item has). Each one is printed once per process, so
// a hot loop never floods the console. Nothing here changes a result.

const seen = new Set<string>();

export function warnOnce(message: string): void {
  if (seen.has(message)) return;
  seen.add(message);
  const output = (globalThis as { console?: { warn?: (message: string) => void } }).console;
  output?.warn?.(`[fuzzy-toolkit] ${message}`);
}

/** Every option a public function reads, to catch typos such as `treshold`. */
const KNOWN_OPTIONS = new Set([
  // MatchOptions
  'preset', 'threshold', 'algorithm', 'ignoreWordOrder', 'ignoreSpaces', 'partial', 'phonetic', 'acronyms',
  // NormalizeOptions
  'caseSensitive', 'accentSensitive', 'punctuation', 'strip', 'ignoreWords', 'replace', 'numbers', 'languages',
  'stopwords', 'stripPatterns',
  // Per-function options
  'closeThreshold', 'limit', 'keys', 'includeMatches', 'method', 'left', 'right', 'unique',
]);

/** Names other libraries use (Fuse.js, fuzzball, rapidfuzz...), with what to write here. */
const ALIASES: Readonly<Record<string, string>> = {
  ignorecase: 'caseSensitive (false by default: case is already ignored)',
  iscasesensitive: 'caseSensitive',
  casesensitive: 'caseSensitive',
  ignoreaccents: 'accentSensitive (false by default: accents are already ignored)',
  ignorediacritics: 'accentSensitive (false by default: accents are already ignored)',
  ignorelocation: 'partial: true',
  includescore: 'no option: every match already has a score',
  minscore: 'threshold (0-100)',
  minmatchcharlength: 'threshold (0-100)',
  minsimilarity: 'threshold (0-100)',
  cutoff: 'threshold (0-100)',
  score_cutoff: 'threshold (0-100)',
  scorecutoff: 'threshold (0-100)',
  maxresults: 'limit',
  top: 'limit',
  usetokensort: 'ignoreWordOrder (true by default)',
};

/** Closest known option within two edits, for "did you mean". */
function suggest(name: string): string | undefined {
  const lower = name.toLowerCase();
  let best: string | undefined;
  let bestDistance = 3;
  for (const known of KNOWN_OPTIONS) {
    const d = editDistance(lower, known.toLowerCase(), bestDistance);
    if (d < bestDistance) [best, bestDistance] = [known, d];
  }
  return best;
}

/** Plain Levenshtein, small strings only: kept here so warnings stay tree-shakable. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) >= max) return max;
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const next = [i];
    for (let j = 1; j <= b.length; j += 1) {
      next[j] = Math.min(row[j]! + 1, next[j - 1]! + 1, row[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    row = next;
  }
  return row[b.length]!;
}

/** Checks the options a caller passed. Runs once per options object (engines are cached). */
export function checkOptions(options: object): void {
  for (const name of Object.keys(options)) {
    if (KNOWN_OPTIONS.has(name)) continue;
    const alias = ALIASES[name.toLowerCase()];
    const guess = alias ? undefined : suggest(name);
    const hint = alias ? ` Instead: ${alias}.` : guess ? ` Did you mean "${guess}"?` : '';
    warnOnce(
      `Unknown option "${name}", ignored.${hint} ` +
        'See https://tfoucher5.github.io/fuzzy-toolkit/guide/options',
    );
  }
  const threshold = (options as { threshold?: unknown }).threshold;
  if (typeof threshold === 'number' && threshold > 0 && threshold < 1) {
    warnOnce(
      `threshold ${threshold} looks like a 0-1 score, but fuzzy-toolkit scores go from 0 to 100: ` +
        `use ${Math.round(threshold * 100)} instead. (Only fuzzy-toolkit/string-similarity returns 0-1 ratings.)`,
    );
  }
}
