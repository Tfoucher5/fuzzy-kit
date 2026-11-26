// Checks for people who write language packs and presets. Works with any test
// runner: `check*` returns the problems found, `assert*` throws one error that
// lists them all.
//
//   import { assertLanguage } from 'fuzzy-toolkit/testing'
//   test('pt', () => assertLanguage(pt, { numbers: [['vinte e um', '21']] }))

import { defineLanguage, definePreset } from './define.js';
import { compare } from './matcher.js';
import { normalize } from './normalize.js';
import type {
  Language,
  LanguageDefinition,
  MatchOptions,
  NormalizeOptions,
  PresetDefinition,
  PresetPack,
} from './types.js';

/** Two texts: `[input, expected]`, or two texts to compare. */
export type Pair = readonly [string, string];

/** What a language pack must do, each case written as `[input, expected]` or a pair. */
export interface LanguageCases {
  /** Numbers in words read as digits: `['vinte e um', '21']`. */
  readonly numbers?: readonly Pair[];
  /** Leading articles removed with `strip: ['articles']`: `['Os Mutantes', 'mutantes']`. */
  readonly articles?: readonly Pair[];
  /** Stop words removed with `stopwords: true`: `['Cidade de Deus', 'cidade deus']`. */
  readonly stopwords?: readonly Pair[];
  /** Spellings that sound alike and must match with `phonetic: true`: `['kasa', 'casa']`. */
  readonly sounds?: readonly Pair[];
  /** Different words that must not match, even with `phonetic: true`: `['pato', 'gato']`. */
  readonly distinct?: readonly Pair[];
}

/** What a preset must do. */
export interface PresetCases {
  /** Pairs that must match with the preset. */
  readonly matches?: readonly Pair[];
  /** Pairs that must not match with the preset. */
  readonly differs?: readonly Pair[];
  /** Text normalized with the preset: `['ACME Inc.', 'acme']`. */
  readonly normalized?: readonly Pair[];
}

/** One thing the pack does not do as expected. */
export interface Problem {
  /** The group of cases (`numbers`, `sounds`...) or `pack` for the pack itself. */
  readonly check: string;
  /** What went wrong, in one sentence. */
  readonly message: string;
}

type Add = (check: string, message: string) => void;

function collector(): [Problem[], Add] {
  const problems: Problem[] = [];
  return [problems, (check, message) => problems.push(Object.freeze({ check, message }))];
}

const show = (text: string) => JSON.stringify(text);

function pairs(add: Add, check: string, cases: readonly Pair[] | undefined, run: (pair: Pair) => string | undefined) {
  if (cases === undefined) return;
  if (!Array.isArray(cases)) {
    add(check, `"${check}" must be an array of [text, text] pairs.`);
    return;
  }
  for (const pair of cases as readonly unknown[]) {
    if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== 'string' || typeof pair[1] !== 'string') {
      add(check, `${JSON.stringify(pair)} is not a [text, text] pair.`);
      continue;
    }
    let message: string | undefined;
    try {
      message = run(pair as unknown as Pair);
    } catch (error) {
      message = `${show(String(pair[0]))} throws: ${(error as Error).message}`;
    }
    if (message !== undefined) add(check, message);
  }
}

function expectNormalized(options: NormalizeOptions): (pair: Pair) => string | undefined {
  return ([input, expected]) => {
    const actual = normalize(input, options);
    if (actual !== expected) return `${show(input)} gives ${show(actual)}, expected ${show(expected)}.`;
    const again = normalize(actual, options);
    if (again !== actual) return `${show(input)} gives ${show(actual)}, which normalizes again to ${show(again)}.`;
    return undefined;
  };
}

function expectMatch(options: MatchOptions, wanted: boolean): (pair: Pair) => string | undefined {
  return ([a, b]) => {
    const { score, match } = compare(a, b, options);
    if (match === wanted) return undefined;
    return `${show(a)} and ${show(b)} ${wanted ? 'should match' : 'should not match'} (score ${score}).`;
  };
}

function report(kind: string, name: string, problems: readonly Problem[]): void {
  if (problems.length === 0) return;
  const lines = problems.map((p) => `  ${p.check}: ${p.message}`);
  const count = problems.length === 1 ? '1 problem' : `${problems.length} problems`;
  throw new Error(`[fuzzy-toolkit] ${kind} ${show(name)}: ${count}\n${lines.join('\n')}`);
}

function languagePack(add: Add, pack: Language | LanguageDefinition): Language | undefined {
  try {
    // A pack made with defineLanguage() is checked again: it may have been edited by hand.
    const checked = defineLanguage(pack);
    if (!checked.name) add('pack', 'add a "name", in English: "Portuguese".');
    return (pack as Language).kind === 'language' ? (pack as Language) : checked;
  } catch (error) {
    add('pack', (error as Error).message);
    return undefined;
  }
}

/**
 * Checks a language pack against the cases its author expects, and returns
 * every problem found (an empty array when all is well).
 *
 * @example
 * checkLanguage(pt, {
 *   numbers: [['vinte e um', '21']],
 *   articles: [['Os Mutantes', 'mutantes']],
 *   sounds: [['kasa', 'casa']],
 *   distinct: [['pato', 'gato']],
 * }) // []
 */
export function checkLanguage(pack: Language | LanguageDefinition, cases: LanguageCases = {}): Problem[] {
  const [problems, add] = collector();
  const language = languagePack(add, pack);
  if (!language) return problems;
  const languages = [language];
  pairs(add, 'numbers', cases.numbers, expectNormalized({ languages }));
  pairs(add, 'articles', cases.articles, expectNormalized({ languages, strip: ['articles'] }));
  pairs(add, 'stopwords', cases.stopwords, expectNormalized({ languages, stopwords: true }));
  pairs(add, 'sounds', cases.sounds, expectMatch({ languages, phonetic: true }, true));
  pairs(add, 'distinct', cases.distinct, expectMatch({ languages, phonetic: true }, false));
  return problems;
}

/**
 * Like `checkLanguage()`, but throws one error listing every problem. Use it
 * in a test with any runner (node:test, Vitest, Jest...).
 *
 * @example
 * test('Portuguese pack', () => assertLanguage(pt, { numbers: [['vinte e um', '21']] }))
 */
export function assertLanguage(pack: Language | LanguageDefinition, cases: LanguageCases = {}): void {
  report('Language', String((pack as Language)?.code), checkLanguage(pack, cases));
}

/**
 * Checks a preset against the cases its author expects, and returns every
 * problem found (an empty array when all is well).
 *
 * @example
 * checkPreset(companyNames, {
 *   matches: [['ACME Inc.', 'Acme']],
 *   differs: [['Acme', 'Apex']],
 * }) // []
 */
export function checkPreset(preset: PresetPack | PresetDefinition, cases: PresetCases = {}): Problem[] {
  const [problems, add] = collector();
  let pack: PresetPack;
  try {
    pack = (preset as PresetPack).kind === 'preset' ? (preset as PresetPack) : definePreset(preset as PresetDefinition);
    if ((preset as PresetPack).kind === 'preset') {
      definePreset({ name: pack.name, description: pack.description, version: pack.version, options: pack.options });
    }
  } catch (error) {
    add('pack', (error as Error).message);
    return problems;
  }
  if (!pack.description) add('pack', 'add a "description": one sentence on what the preset is for.');
  const options: MatchOptions = { preset: pack };
  pairs(add, 'matches', cases.matches, expectMatch(options, true));
  pairs(add, 'differs', cases.differs, expectMatch(options, false));
  pairs(add, 'normalized', cases.normalized, expectNormalized(pack.options));
  return problems;
}

/**
 * Like `checkPreset()`, but throws one error listing every problem.
 *
 * @example
 * test('company names', () => assertPreset(companyNames, { matches: [['ACME Inc.', 'Acme']] }))
 */
export function assertPreset(preset: PresetPack | PresetDefinition, cases: PresetCases = {}): void {
  report('Preset', String((preset as PresetPack)?.name), checkPreset(preset, cases));
}
