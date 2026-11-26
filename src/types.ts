/**
 * Scoring strategy.
 *
 * - `smart` *(default)*: typo-tolerant (Damerau), ignores word order and
 *   missing spaces. Right for most uses.
 * - `levenshtein`: plain character edit distance.
 * - `damerau`: edit distance where swapped letters (`teh` / `the`) count once.
 * - `jaroWinkler`: favors a shared prefix, good for short names.
 * - `tokenSort`: compares words after sorting them.
 * - `tokenSet`: compares shared words; a subset scores 100.
 */
export type Algorithm =
  | 'smart'
  | 'levenshtein'
  | 'damerau'
  | 'jaroWinkler'
  | 'tokenSort'
  | 'tokenSet';

/**
 * Ready-made configurations. Your own options always win over the preset.
 *
 * - `music`: song titles and artists. Drops `(feat. X)`, `- Remastered 2011`,
 *   bracketed info and leading articles (`The`, `Les`...), reads `&` and `n` as `and`.
 * - `search`: search-as-you-type. Matches prefixes, parts of the text
 *   (`partial: true`) and initials (`acronyms: true`), threshold 70, numbers
 *   left as written.
 * - `strict`: word order and spaces matter, threshold 90.
 */
export type Preset = 'music' | 'search' | 'strict';

/** Languages built into the package, usable by their code. */
export type BuiltinLanguage = 'en' | 'fr';

/**
 * One rewrite of the phonetic ("sounds like") key: a regular expression and
 * its replacement, applied in order to a normalized word (lower case, no
 * accents). Use a `g` flag to rewrite every occurrence.
 * @example
 * [/ph/g, 'f']
 */
export type PhoneticRule = readonly [RegExp, string];

/**
 * How a language writes numbers in words, so `veintiuno`, `dos` or `II` read
 * as digits. Words are matched on normalized text (lower case, no accents).
 */
export interface NumberWords {
  /** Words for 0 to 19, the index is the value: `['cero', 'uno', 'dos', ...]`. Empty strings are skipped. */
  readonly units?: readonly string[];
  /** Words for tens, the index times 10 is the value: `['', '', 'veinte', 'treinta', ...]`. */
  readonly tens?: readonly string[];
  /** Ordinal words, the index is the value: `['', 'primero', 'segundo', ...]`. */
  readonly ordinals?: readonly string[];
  /** More cardinal words, such as compounds written as one word: `{ una: 1, veintiuno: 21 }`. */
  readonly words?: Readonly<Record<string, number>>;
  /** More ordinal words: `{ primera: 1 }`. */
  readonly ordinalWords?: Readonly<Record<string, number>>;
  /**
   * A word between tens and units: `'y'` reads `treinta y uno` as 31. Without
   * it, tens followed by a unit are added up (`twenty one` = 21).
   */
  readonly joiner?: string;
  /**
   * Suffixes that turn digits into an ordinal, such as `['eme', 'e', 'er']`
   * in French (`2eme` → `2e`). The result goes through {@link formatOrdinal}.
   */
  readonly ordinalSuffixes?: readonly string[];
  /**
   * How an ordinal is written once read: `(n) => n + 'th'`.
   * @default String(n)
   */
  readonly formatOrdinal?: (n: number) => string;
  /**
   * A custom reader, for grammars the tables can't express (`quatre vingt
   * dix` = 90). Gets the normalized words and a position, returns the value
   * read there and how many words it used, or `undefined`.
   */
  readonly read?: (words: readonly string[], index: number) => readonly [value: number, used: number] | undefined;
}

/** What a language pack contains. Every field is optional except `code`. */
export interface LanguageDefinition {
  /** Language code, ideally ISO 639-1 (`es`, `de`, `pt-br`...). */
  readonly code: string;
  /** Human-readable name, in English: `Spanish`. */
  readonly name?: string;
  /** Version of the pack, for saved indexes and the registry. */
  readonly version?: string;
  /** Numbers written in words. */
  readonly numbers?: NumberWords;
  /** Leading articles removed by `strip: ['articles']`: `['el', 'la', 'los', 'las']`. */
  readonly articles?: readonly string[];
  /** Articles glued with an apostrophe, removed by `strip: ['articles']`: `['l']` for `l'amour`. */
  readonly elisions?: readonly string[];
  /** Words that carry little meaning, ignored with `stopwords: true`: `['de', 'y']`. */
  readonly stopwords?: readonly string[];
  /** Rules of the phonetic key, used with `phonetic: true`. */
  readonly phonetic?: readonly PhoneticRule[];
  /** Whole-word replacements always applied: abbreviations, common spellings. */
  readonly replace?: Readonly<Record<string, string>>;
}

/** A language pack, made with `defineLanguage()`. */
export interface Language extends LanguageDefinition {
  readonly kind: 'language';
  /** Version of the extension API the pack was written for. */
  readonly apiVersion: 1;
}

/** What a preset contains. */
export interface PresetDefinition {
  /** Short unique name, in kebab case: `addresses`, `company-names`. */
  readonly name: string;
  /** One sentence on what it is for. */
  readonly description?: string;
  /** Version of the preset, for saved indexes and the registry. */
  readonly version?: string;
  /** A preset to start from: its options apply first. */
  readonly extends?: Preset | PresetPack;
  /** The options the preset sets. Users' own options always win. */
  readonly options: Omit<MatchOptions, 'preset'>;
}

/** A preset, made with `definePreset()`. `options` already include `extends`. */
export interface PresetPack extends Omit<PresetDefinition, 'extends'> {
  readonly kind: 'preset';
  /** Version of the extension API the preset was written for. */
  readonly apiVersion: 1;
}

/**
 * Noise that can be removed before comparing.
 *
 * - `brackets`: anything in `( )`, `[ ]` or `{ }`.
 * - `featuring`: `feat. X`, `ft. X`, `featuring X` until the end, and `(with X)`.
 * - `version`: `- Remastered 2011`, `(Live)`, `- Radio Edit`, `(Acoustic)`...
 * - `articles`: a leading article of the active `languages` (`the`, `a`,
 *   `le`, `la`, `les`, `l'`; without `languages`, also `el`, `il`, `die`...).
 */
export type StripRule = 'brackets' | 'featuring' | 'version' | 'articles';

/** How text is cleaned up before being compared. */
export interface NormalizeOptions {
  /**
   * Treat `A` and `a` as different characters.
   * @default false
   */
  caseSensitive?: boolean;

  /**
   * Treat `é` and `e` as different characters. Ligatures (`œ`, `æ`, `ß`) are
   * expanded unless this is true.
   * @default false
   */
  accentSensitive?: boolean;

  /**
   * What to do with punctuation. Apostrophes are always removed outright
   * (`don't` → `dont`) unless `keep` is used.
   * - `space`: replace it with a space (`saint-nazaire` → `saint nazaire`)
   * - `remove`: delete it (`saint-nazaire` → `saintnazaire`)
   * - `keep`: leave it untouched
   * @default 'space'
   */
  punctuation?: 'space' | 'remove' | 'keep';

  /**
   * Noise to remove before comparing.
   * @example
   * strip: ['featuring', 'version'] // "Song (feat. X) - Remastered" → "song"
   */
  strip?: readonly StripRule[];

  /**
   * Whole words to ignore, such as stop words.
   * @example
   * ignoreWords: ['inc', 'ltd', 'sa']
   */
  ignoreWords?: readonly string[];

  /**
   * Whole-word replacements applied before comparing: abbreviations,
   * synonyms, common misspellings. Keys are matched without case or accents.
   * @example
   * replace: { st: 'saint', '&': 'and', nyc: 'new york city' }
   */
  replace?: Readonly<Record<string, string>>;

  /**
   * Read numbers written in words (English and French) and roman numerals as
   * digits: `two` = `deux` = `II` = `2`, `twenty one` = `vingt et un` = `21`,
   * `first` = `1st`. Single letters (`I`, `V`, `X`) are left alone.
   * @default true (false with the `search` preset, so prefixes keep working)
   */
  numbers?: boolean;

  /**
   * Languages to read the text in: numbers in words, articles, stop words and
   * phonetic rules. Built-in codes (`'en'`, `'fr'`) or packs made with
   * `defineLanguage()`. Order matters when two languages read a word.
   * @default ['en', 'fr']
   * @example
   * import es from './my-spanish-pack.js'
   * languages: ['en', es]
   */
  languages?: readonly (BuiltinLanguage | Language)[];

  /**
   * Ignore the stop words of the active `languages` (`the`, `of`, `de`, `et`...).
   * @default false
   */
  stopwords?: boolean;

  /**
   * More noise to remove, as regular expressions run on the lower-cased,
   * accent-free text before punctuation is removed. Matches become a space.
   * Presets use it for their own rules.
   * @example
   * stripPatterns: [/\bcedex\b.*$/]
   */
  stripPatterns?: readonly RegExp[];
}

/** Everything that controls a comparison. All fields are optional. */
export interface MatchOptions extends NormalizeOptions {
  /**
   * Start from a ready-made configuration: a built-in name or a preset made
   * with `definePreset()`.
   * @see Preset
   */
  preset?: Preset | PresetPack;

  /**
   * Minimum score (0 to 100) for two texts to match.
   * @default 80
   */
  threshold?: number;

  /**
   * Scoring strategy. Leave it to `smart` unless you have a reason.
   * @default 'smart'
   */
  algorithm?: Algorithm;

  /**
   * `smart` only: `john smith` matches `smith john`.
   * @default true
   */
  ignoreWordOrder?: boolean;

  /**
   * `smart` only: `stairwaytoheaven` matches `stairway to heaven`.
   * @default true
   */
  ignoreSpaces?: boolean;

  /**
   * `smart` only: the shorter text may match just a part of the longer one,
   * prefixes included (`stair` matches `Stairway to Heaven`). Ideal for search.
   * A full match always scores higher than a partial one.
   * @default false (true with the `search` preset)
   */
  partial?: boolean;

  /**
   * `smart` only: also accept texts that sound the same (English and French),
   * for answers spelled by ear: `beyonsay` = `Beyoncé`, `nite` = `night`,
   * `fone` = `phone`, `kwin` = `Queen`. A match on sound alone scores at most 95,
   * so the right spelling always ranks first.
   * @default false
   */
  phonetic?: boolean;
  /**
   * `smart` only: a single word may be the initials of the other text:
   * `nyc` = `New York City`, `gs` = `git status`, one typo allowed from 3
   * letters on (`nyx`). An acronym match scores 90, or 80 with a typo, so
   * real matches rank first.
   * @default false (true with the `search` preset)
   */
  acronyms?: boolean;

  /**
   * `smart` only: like `partial`, and a match may also start in the middle of
   * a word: `phone` finds `iPhone 15`, `ville` finds `Villeneuve` and
   * `Belleville`. Turns `partial` on. A match from the start of a word still
   * ranks first: a mid-word match counts 95 %. Opt-in, scores are unchanged
   * without it.
   * @default false
   */
  substring?: boolean;
}

/** Options of {@link check}. */
export interface CheckOptions extends MatchOptions {
  /**
   * Minimum score for a guess to count as `close` ("almost!").
   * @default threshold - 15
   */
  closeThreshold?: number;
}

type Depth = [never, 0, 1, 2];
type IsText<V> = NonNullable<V> extends string | readonly string[] ? true : false;
type Item<V> = NonNullable<V> extends readonly (infer U)[] ? NonNullable<U> : NonNullable<V>;

/**
 * Names of the properties of `T` that hold text, including nested ones as
 * dotted paths (`'artist.name'`, up to 3 levels). Arrays along the path are
 * read item by item.
 */
export type TextKey<T, D extends number = 3> = [D] extends [never]
  ? never
  : {
      [K in keyof T & string]-?: IsText<T[K]> extends true
        ? K
        : Item<T[K]> extends string | number | boolean | bigint | symbol | ((...args: never[]) => unknown)
          ? never
          : Item<T[K]> extends object
            ? `${K}.${TextKey<Item<T[K]>, Depth[D]>}`
            : never;
    }[keyof T & string];

/**
 * A property that counts less (or more) than others. Matches on it score
 * `score × weight`.
 * @example
 * keys: ['title', { name: 'artist', weight: 0.8 }]
 */
export interface WeightedKey<T> {
  /** Property holding text. */
  name: TextKey<T>;
  /**
   * Multiplier applied to scores on this property, usually between 0 and 1.
   * @default 1
   */
  weight: number;
}

/**
 * Where to find the text of an item: a property name, several property names
 * (optionally weighted), or a function. Each item may provide several texts;
 * the best one wins.
 */
export type KeysOption<T> =
  | TextKey<T>
  | readonly (TextKey<T> | WeightedKey<T>)[]
  | ((item: T) => string | readonly string[] | null | undefined);

/** Options of list functions ({@link search}, {@link closest}). */
export interface ListOptions<T> extends MatchOptions {
  /**
   * Maximum number of results.
   * @default Infinity
   */
  limit?: number;

  /**
   * Where to read the text of each item. Required when items are objects.
   * @example
   * search('queen', songs, { keys: ['title', 'artist'] })
   * search('queen', songs, { keys: (song) => song.artist.name })
   */
  keys?: KeysOption<T>;
  /**
   * Add `ranges` to each result: the parts of `text` that match the query,
   * ready to highlight in a list of results.
   * @default false
   * @example
   * search('queen', songs, { keys: ['title', 'artist.name'], includeMatches: true })[0]
   * // { ..., text: 'Queen', key: 'artist.name', ranges: [[0, 5]] }
   */
  includeMatches?: boolean;
}

/** Options of {@link dedupe} and {@link group}. */
export interface GroupOptions<T> extends MatchOptions {
  /** Where to read the text of each item. Required when items are objects. */
  keys?: KeysOption<T>;
  /**
   * - `fuzzy` *(default)*: near-duplicates, typos included.
   * - `fingerprint`: same words once normalized, in any order, repeats
   *   ignored (OpenRefine's key collision). No typo tolerance, but instant on
   *   any size of list: a first pass before a fuzzy one on huge files.
   * @default 'fuzzy'
   */
  method?: 'fuzzy' | 'fingerprint';
}

/** Same as `O`, but `keys` is required unless items are strings. */
export type WithKeys<T, O extends { keys?: unknown }> = T extends string
  ? O
  : O & { keys: KeysOption<T> };

/** One result of a list function. */
export interface Match<T> {
  /** The original item. */
  item: T;
  /** Similarity score, from 0 to 100. */
  score: number;
  /** Position of the item in the original list. */
  index: number;
  /** The text of the item that produced the score. */
  text: string;
  /** The property `text` was read from, when `keys` names properties. */
  key?: string;
  /**
   * With `includeMatches`: the parts of `text` that match the query, as
   * `[start, end]` positions (`text.slice(start, end)`).
   */
  ranges?: [start: number, end: number][];
}

/** Outcome of {@link check}. */
export type Verdict = 'correct' | 'close' | 'wrong';

/** Result of {@link check}. */
export interface CheckResult {
  /** `correct`, `close` ("almost!") or `wrong`. */
  verdict: Verdict;
  /** Shortcut for `verdict === 'correct'`. */
  correct: boolean;
  /** Shortcut for `verdict === 'close'`. */
  close: boolean;
  /** Best score among the accepted answers, from 0 to 100. */
  score: number;
  /** The accepted answer closest to the guess, if any. */
  answer: string | undefined;
}

/** Detailed result of {@link compare}, useful to tune options. */
export interface Comparison {
  /** Similarity score, from 0 to 100. */
  score: number;
  /** Whether `score >= threshold`. */
  match: boolean;
  /** Threshold used. */
  threshold: number;
  /** Algorithm used. */
  algorithm: Algorithm;
  /** `a` after normalization. */
  a: string;
  /** `b` after normalization. */
  b: string;
  /**
   * Score of each strategy tried. With `smart`, the final score is the best
   * of them.
   */
  scores: Partial<Record<'characters' | 'wordOrder' | 'spaces' | 'partial' | 'phonetic' | 'acronym' | Algorithm, number>>;
}

/** Result of {@link checkAll}: one verdict per part of the answer. */
export interface MultiCheckResult<K extends string> {
  /** Whether every part was found in the guess. */
  correct: boolean;
  /** Parts found in the guess, in the order they were given. */
  found: K[];
  /** Parts not found (`close` or `wrong`). */
  missing: K[];
  /** The detailed result of each part. */
  parts: Record<K, CheckResult>;
}

/** Options of {@link join}. */
export interface JoinOptions<L, R> extends MatchOptions {
  /** Where to read the text of left items. Required when they are objects. */
  left?: KeysOption<L>;
  /** Where to read the text of right items. Required when they are objects. */
  right?: KeysOption<R>;
  /**
   * Use each right item at most once: when two left items want the same one,
   * the better match gets it and the other takes its next best choice.
   * @default false
   */
  unique?: boolean;
}

/** One row of {@link join}: a left item and its best match on the right, if any. */
export interface JoinRow<L, R> {
  /** The left item. */
  item: L;
  /** Position of the left item in its list. */
  index: number;
  /** The best right item, or `undefined` if none reaches the threshold. */
  match: Match<R> | undefined;
}
