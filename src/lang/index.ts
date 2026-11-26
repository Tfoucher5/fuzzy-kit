import { checkLanguage } from '../core.js';
import type { BuiltinLanguage, Language } from '../types.js';
import { en } from './en.js';
import { fr } from './fr.js';

/** Languages usable by their code. */
export const BUILTIN_LANGUAGES: Readonly<Record<BuiltinLanguage, Language>> = Object.freeze({ en, fr });

/** Used when no `languages` option is given. */
export const DEFAULT_LANGUAGES: readonly Language[] = Object.freeze([en, fr]);

/**
 * Articles stripped when no `languages` option is given: English and French,
 * plus the Spanish, Italian and German ones fuzzy-toolkit always removed.
 */
export const DEFAULT_ARTICLES: readonly string[] = Object.freeze([
  'the', 'an', 'a', 'le', 'la', 'les', 'un', 'une', 'des', 'el', 'los', 'las', 'il', 'lo', 'gli', 'die', 'der', 'das', 'l',
]);

/** Packs shipped as separate imports, so bundles only carry the ones used. */
const OPTIONAL = ['es', 'de', 'it'];

/** Turns the `languages` option into packs; `null` when it was not given. */
export function resolveLanguages(list: readonly (BuiltinLanguage | Language)[] | undefined): readonly Language[] | null {
  if (list === undefined) return null;
  if (!Array.isArray(list)) throw new TypeError('[fuzzy-toolkit] "languages" must be an array.');
  return Object.freeze(
    list.map((item) => {
      if (typeof item === 'string') {
        const found = Object.prototype.hasOwnProperty.call(BUILTIN_LANGUAGES, item)
          ? BUILTIN_LANGUAGES[item as BuiltinLanguage]
          : undefined;
        if (!found) {
          throw new TypeError(
            `[fuzzy-toolkit] Unknown language "${item}". Usable by their code: ${Object.keys(BUILTIN_LANGUAGES).join(', ')}. ` +
              (OPTIONAL.includes(item)
                ? `Import the pack and pass it: import ${item} from 'fuzzy-toolkit/lang/${item}', then languages: [${item}].`
                : 'For another language, pass a pack made with defineLanguage().'),
          );
        }
        return found;
      }
      return checkLanguage(item);
    }),
  );
}
