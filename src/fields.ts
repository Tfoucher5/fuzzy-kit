import { similarity } from './matcher.js';

/** A field of `from` paired with a field of `to`. */
export interface FieldMatch {
  from: string;
  to: string;
  /** 0 to 100. */
  score: number;
}

export interface FieldMapping {
  /** `from` field name to `to` field name, for each pair found. */
  mapping: Record<string, string>;
  /** The pairs, best first. */
  matches: FieldMatch[];
  /** Fields of `from` paired with nothing. */
  unmatched: string[];
  /** Fields of `to` that nothing was paired with. */
  missing: string[];
}

export interface MapFieldsOptions {
  /** Minimum score (0 to 100) to pair two fields. Default 70. */
  threshold?: number;
  /**
   * More words that mean the same in your data, added to the built-in ones:
   * `{ sku: ['ref', 'reference', 'item code'] }`.
   */
  synonyms?: Readonly<Record<string, readonly string[]>>;
}

// Words that mean the same in field names: each one is read as its key.
const SYNONYMS: Record<string, string[]> = {
  'postal code': ['zip', 'zipcode', 'postcode', 'postalcode', 'cp', 'plz'],
  phone: ['tel', 'telephone', 'mobile', 'cell', 'cellphone', 'phone number', 'telefono', 'telefon'],
  email: ['e mail', 'mail', 'courriel', 'email address'],
  'date of birth': ['dob', 'birthdate', 'birthday', 'birth date', 'date de naissance'],
  'first name': ['fname', 'firstname', 'given name', 'forename', 'prenom'],
  'last name': ['lname', 'lastname', 'surname', 'family name', 'nom'],
  quantity: ['qty', 'quantite', 'cantidad'],
  amount: ['amt', 'montant'],
  address: ['addr', 'adresse', 'street address', 'direccion'],
  number: ['num', 'no', 'nbr', 'numero', 'nr'],
  description: ['desc', 'descr'],
  identifier: ['id'],
  image: ['img', 'picture', 'photo'],
  url: ['link', 'website', 'web'],
  company: ['org', 'organization', 'organisation', 'employer', 'societe', 'entreprise'],
  department: ['dept'],
  country: ['pays', 'pais'],
  city: ['town', 'ville', 'ciudad', 'stadt'],
  price: ['prix', 'precio', 'cost', 'unit price'],
  created: ['created at', 'creation date', 'date created'],
  updated: ['updated at', 'modified', 'last modified'],
};

const OPTIONS = { numbers: false, partial: true, acronyms: true, threshold: 0 } as const;

function lookup(extra: MapFieldsOptions['synonyms']): Map<string, string> {
  const table = new Map<string, string>();
  for (const source of [SYNONYMS, extra ?? {}]) {
    for (const [key, words] of Object.entries(source)) {
      for (const word of words) table.set(plain(word), plain(key));
    }
  }
  return table;
}

/** `firstName`, `first_name`, `First-Name` and `FIRST NAME` all read `first name`. */
function plain(name: string): string {
  return name
    .replace(/#/g, ' number ')
    .replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2')
    .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, '$1 $2')
    .replace(/(\p{L})(\d)|(\d)(\p{L})/gu, '$1$3 $2$4')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** The name with each known word or phrase replaced by its key. */
function canonical(name: string, table: Map<string, string>): string {
  const text = plain(name);
  const whole = table.get(text);
  if (whole !== undefined) return whole;
  const words = text.split(' ');
  const out: string[] = [];
  for (let i = 0; i < words.length; i += 1) {
    // Two-word phrases first ("birth date"), then single words.
    const pair = i + 1 < words.length ? table.get(`${words[i]} ${words[i + 1]}`) : undefined;
    if (pair !== undefined) {
      out.push(pair);
      i += 1;
    } else out.push(table.get(words[i]!) ?? words[i]!);
  }
  return out.join(' ');
}

/**
 * Pairs the fields of one list with the fields of another: CSV headers with
 * your columns, a form with your model, the keys an AI returned with your
 * schema. Reads camelCase, snake_case and kebab-case, knows common synonyms
 * (zip and postal code, dob and date of birth, qty and quantity...), and pairs
 * each field at most once, best scores first.
 *
 * @example
 * mapFields(['First Name', 'E-mail', 'Zip', 'Phone #'], ['firstName', 'email', 'postalCode', 'phoneNumber']).mapping
 * // { 'First Name': 'firstName', 'E-mail': 'email', Zip: 'postalCode', 'Phone #': 'phoneNumber' }
 */
export function mapFields(from: readonly string[], to: readonly string[], options: MapFieldsOptions = {}): FieldMapping {
  const threshold = options.threshold ?? 70;
  const table = lookup(options.synonyms);
  const left = from.map((name) => canonical(String(name), table));
  const right = to.map((name) => canonical(String(name), table));

  const pairs: [number, number, number][] = [];
  for (let i = 0; i < left.length; i += 1) {
    for (let j = 0; j < right.length; j += 1) {
      const score = left[i] === right[j] ? 100 : similarity(left[i]!, right[j]!, OPTIONS);
      if (score >= threshold) pairs.push([score, i, j]);
    }
  }
  // Best first; on a tie, the order of the lists.
  pairs.sort((x, y) => y[0] - x[0] || x[1] - y[1] || x[2] - y[2]);

  const usedFrom = new Set<number>();
  const usedTo = new Set<number>();
  const matches: FieldMatch[] = [];
  for (const [score, i, j] of pairs) {
    if (usedFrom.has(i) || usedTo.has(j)) continue;
    usedFrom.add(i);
    usedTo.add(j);
    matches.push({ from: from[i]!, to: to[j]!, score });
  }
  return {
    mapping: Object.fromEntries(matches.map((m) => [m.from, m.to])),
    matches,
    unmatched: from.filter((_, i) => !usedFrom.has(i)),
    missing: to.filter((_, j) => !usedTo.has(j)),
  };
}
