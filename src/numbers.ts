/**
 * Rewrites numbers written in words and roman numerals as digits, so
 * `two become one`, `2 Become 1` and `II` / `2` compare equal. The words come
 * from language packs. Works on normalized text: lower case, single spaces.
 */
import type { Language, NumberWords } from './types.js';

type Read = (words: readonly string[], index: number) => readonly [number, number] | undefined;

/** One language's number words, compiled into lookups. */
interface Reader {
  readonly ordinals: Map<string, number>;
  readonly formatOrdinal: (n: number) => string;
  readonly read: Read | undefined;
  readonly suffixRe: RegExp | null;
  readonly starters: readonly string[];
}

function lookup(list: readonly string[] | undefined, step: number, extra?: Readonly<Record<string, number>>): Map<string, number> {
  const map = new Map<string, number>();
  list?.forEach((word, i) => word && map.set(word, i * step));
  if (extra) for (const [word, n] of Object.entries(extra)) map.set(word, n);
  return map;
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compileReader(numbers: NumberWords): Reader {
  const units = lookup(numbers.units, 1, numbers.words);
  const tens = lookup(numbers.tens, 10);
  const ordinals = lookup(numbers.ordinals, 1, numbers.ordinalWords);
  const joiner = numbers.joiner;
  // Tens, then optionally the joiner and a unit from 1 to 9.
  const generic: Read = (words, i) => {
    const ten = tens.get(words[i]!);
    if (ten !== undefined) {
      const at = joiner !== undefined && words[i + 1] === joiner ? i + 2 : i + 1;
      const unit = units.get(words[at] ?? '');
      return unit !== undefined && unit >= 1 && unit <= 9 ? [ten + unit, at + 1 - i] : [ten, 1];
    }
    const unit = units.get(words[i]!);
    return unit === undefined ? undefined : [unit, 1];
  };
  const suffixes = numbers.ordinalSuffixes ?? [];
  return {
    ordinals,
    formatOrdinal: numbers.formatOrdinal ?? String,
    read: numbers.read ?? (units.size > 0 || tens.size > 0 ? generic : undefined),
    suffixRe: suffixes.length > 0 ? new RegExp(`^(\\d+)(?:${suffixes.map(escape).join('|')})$`) : null,
    starters: [...units.keys(), ...tens.keys(), ...ordinals.keys()],
  };
}

const ROMAN_RE = /^(x{0,3})(ix|iv|v?i{0,3})$/;
const ROMAN = { i: 1, v: 5, x: 10 } as const;

function roman(word: string): number | undefined {
  if (word.length < 2 || !ROMAN_RE.test(word)) return undefined;
  let total = 0;
  for (let i = 0; i < word.length; i += 1) {
    const value = ROMAN[word[i] as keyof typeof ROMAN];
    const next = ROMAN[word[i + 1] as keyof typeof ROMAN] ?? 0;
    total += value < next ? -value : value;
  }
  return total;
}

/** Rewrites numbers in a normalized text as digits. */
export type NumberRewriter = (text: string) => string;

const compiled = new WeakMap<readonly Language[], NumberRewriter>();

/**
 * Builds the number reader of a list of languages. When several read the
 * same word, the one that reads the most words wins, then the first listed.
 */
export function compileNumbers(languages: readonly Language[]): NumberRewriter {
  const cached = compiled.get(languages);
  if (cached) return cached;
  const readers = languages.filter((l) => l.numbers).map((l) => compileReader(l.numbers!));
  const starters = new Set(readers.flatMap((r) => r.starters));
  const suffixes = readers.map((r) => r.suffixRe).filter((re): re is RegExp => re !== null);
  // Quick test: does the text contain anything that may be a number?
  const maybe = new RegExp(
    `(?:^| )(?:${[...[...starters].map(escape), '[ivx]{2,}', ...suffixes.map((re) => re.source.slice(1, -1))].join('|')})(?= |$)`,
    'i',
  );

  const rewrite: NumberRewriter = (text) => {
    if (!maybe.test(text)) return text;
    const words = text.split(' ');
    const lowered = words.map((w) => w.toLowerCase());
    let changed = false;
    const out: string[] = [];
    for (let i = 0; i < words.length; ) {
      const word = lowered[i]!;
      let replacement: string | undefined;
      let used = 1;

      if (starters.has(word)) {
        for (const reader of readers) {
          const n = reader.ordinals.get(word);
          if (n !== undefined) {
            replacement = reader.formatOrdinal(n);
            break;
          }
        }
        if (replacement === undefined) {
          let best: readonly [number, number] | undefined;
          for (const reader of readers) {
            const got = reader.read?.(lowered, i);
            if (got && got[1] >= 1 && (!best || got[1] > best[1])) best = got;
          }
          if (best) {
            replacement = String(best[0]);
            used = best[1];
          }
        }
      } else {
        const value = roman(word);
        if (value !== undefined) {
          replacement = String(value);
        } else {
          for (const reader of readers) {
            const m = reader.suffixRe?.exec(word);
            // "01e" is left alone: no language writes ordinals with a leading zero.
            if (m && !m[1]!.startsWith('0')) {
              replacement = reader.formatOrdinal(Number(m[1]));
              break;
            }
          }
        }
      }

      if (replacement === undefined) {
        out.push(words[i]!);
      } else {
        out.push(replacement);
        changed = true;
      }
      i += used;
    }
    return changed ? out.join(' ') : text;
  };
  compiled.set(languages, rewrite);
  return rewrite;
}
