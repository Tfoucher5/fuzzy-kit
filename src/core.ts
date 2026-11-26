// The core of the extension system, kept small: what the engine needs to use
// packs. Checking packs (defineLanguage, definePreset) lives in define.ts, so
// bundles that don't define packs don't carry it.
//
// A pack is a plain, frozen object. Nothing is registered globally: you pass
// the object in the options, so two libraries using different packs never
// step on each other and bundlers drop what you don't import.

import type { Language, LanguageDefinition, MatchOptions, PresetPack } from './types.js';

/** Version of the extension API. A pack written for another version is refused. */
export const API_VERSION = 1;

export function fail(what: string, message: string): never {
  throw new TypeError(`[fuzzy-toolkit] ${what}: ${message}`);
}

export function dropUndefined<T extends object>(value: T): T {
  for (const key of Object.keys(value) as (keyof T)[]) if (value[key] === undefined) delete value[key];
  return value;
}

/** A pack from a trusted definition, without checks: the built-in ones. */
export function language(definition: LanguageDefinition): Language {
  return Object.freeze({ kind: 'language', apiVersion: API_VERSION, ...definition });
}

/** A preset from trusted options, without checks. */
export function preset(name: string, options: MatchOptions, description?: string, version?: string): PresetPack {
  return Object.freeze(
    dropUndefined<PresetPack>({ kind: 'preset', apiVersion: API_VERSION, name, description, version, options: Object.freeze(options) }),
  );
}

/**
 * Merges two sets of options: `over` wins, `replace` tables are combined and
 * `stripPatterns` add up.
 */
export function mergeOptions(base: MatchOptions, over: MatchOptions): MatchOptions {
  const merged: MatchOptions = { ...base };
  for (const key of Object.keys(over) as (keyof MatchOptions)[]) {
    if (over[key] !== undefined) (merged as Record<string, unknown>)[key] = over[key];
  }
  if (base.replace || over.replace) merged.replace = { ...base.replace, ...over.replace };
  if (base.stripPatterns || over.stripPatterns) {
    merged.stripPatterns = [...(base.stripPatterns ?? []), ...(over.stripPatterns ?? [])];
  }
  return merged;
}

/** Checks a language given in the options. */
export function checkLanguage(language: unknown): Language {
  if (typeof language !== 'object' || language === null || (language as Language).kind !== 'language') {
    fail('Invalid language', `pass a built-in code or a pack made with defineLanguage(), got ${JSON.stringify(language)}.`);
  }
  const pack = language as Language;
  if (pack.apiVersion !== API_VERSION) {
    fail(`Language "${pack.code}"`, `was written for extension API ${pack.apiVersion}, this version supports ${API_VERSION}.`);
  }
  return pack;
}
