import { closest } from './matcher.js';
import { mapFields, type MapFieldsOptions } from './fields.js';

/** The part of JSON Schema that {@link repair} reads. Other keywords are ignored. */
export interface JsonSchema {
  type?: string | readonly string[];
  properties?: Readonly<Record<string, JsonSchema>>;
  required?: readonly string[];
  additionalProperties?: boolean | JsonSchema;
  items?: JsonSchema;
  enum?: readonly unknown[];
}

/** One thing {@link repair} changed. */
export interface Repair {
  /** Where, as `items[0].priority` (`''` for the value itself). */
  path: string;
  /** `key`: a property renamed. `value`: an enum value corrected. `type`: a value converted. `removed`: a property the schema does not allow. */
  kind: 'key' | 'value' | 'type' | 'removed';
  from: unknown;
  to: unknown;
}

export interface RepairResult<T = unknown> {
  /** The repaired copy. The input is never changed. */
  value: T;
  /** What was changed, in order. */
  changes: Repair[];
  /** What could not be repaired: a required property missing, a value matching no enum value. */
  unresolved: { path: string; reason: string }[];
}

export interface RepairOptions {
  /** Minimum score (0 to 100) to replace a value with an enum value. Default 70. */
  threshold?: number;
  /** Minimum score to rename a property. Default 70. */
  keyThreshold?: number;
  /** More words that mean the same in property names, as in {@link mapFields}. */
  synonyms?: MapFieldsOptions['synonyms'];
}

const BOOLEANS: Record<string, boolean> = { true: true, yes: true, y: true, on: true, '1': true, false: false, no: false, n: false, off: false, '0': false };
const NUMBER = /^\s*-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?\s*$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function typesOf(schema: JsonSchema): readonly string[] {
  if (schema.type !== undefined) return typeof schema.type === 'string' ? [schema.type] : schema.type;
  if (schema.properties) return ['object'];
  if (schema.items) return ['array'];
  return [];
}

function fits(value: unknown, type: string): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number';
    case 'integer':
      return Number.isInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return isRecord(value);
    case 'null':
      return value === null;
    default:
      return true;
  }
}

/** The value converted to one of the types, or `undefined` when none applies. */
function convert(value: unknown, types: readonly string[]): { to: unknown } | undefined {
  for (const type of types) {
    if ((type === 'number' || type === 'integer') && typeof value === 'string' && NUMBER.test(value)) {
      const n = Number(value);
      if (type === 'number' || Number.isInteger(n)) return { to: n };
    }
    if (type === 'boolean' && typeof value === 'string') {
      const b = BOOLEANS[value.trim().toLowerCase()];
      if (b !== undefined) return { to: b };
    }
    if (type === 'string' && (typeof value === 'number' || typeof value === 'boolean')) return { to: String(value) };
    if (type === 'array' && !Array.isArray(value) && value !== undefined) return { to: [value] };
  }
  return undefined;
}

const join = (path: string, key: string): string => (path ? `${path}.${key}` : key);

/**
 * Repairs a value, such as the JSON a model returned, against the JSON
 * Schema it should follow: property names matched to the schema's
 * (`"Email Address"` to `email`, see {@link mapFields}), enum values
 * corrected (`"hight"` to `"high"`), numbers and booleans written as text
 * converted, a single item wrapped in an array. Returns a repaired copy with
 * the list of changes, and what could not be repaired.
 *
 * @example
 * const schema = { type: 'object', properties: { email: { type: 'string' }, priority: { enum: ['low', 'medium', 'high'] }, age: { type: 'integer' } }, required: ['email'] }
 * repair({ 'Email Address': 'ada@x.io', Priority: 'hight', age: '36' }, schema).value
 * // { email: 'ada@x.io', priority: 'high', age: 36 }
 */
export function repair<T = unknown>(value: unknown, schema: JsonSchema, options: RepairOptions = {}): RepairResult<T> {
  const changes: Repair[] = [];
  const unresolved: { path: string; reason: string }[] = [];
  const choose = { threshold: options.threshold ?? 70 };

  const fix = (input: unknown, rule: JsonSchema | undefined, path: string): unknown => {
    if (!rule || typeof rule !== 'object') return input;
    let current = input;
    const types = typesOf(rule);
    if (types.length > 0 && current !== undefined && !types.some((type) => fits(current, type))) {
      const converted = convert(current, types);
      if (converted) {
        changes.push({ path, kind: 'type', from: current, to: converted.to });
        current = converted.to;
      }
    }

    if (rule.enum && !rule.enum.includes(current)) {
      const choices = rule.enum.filter((c): c is string => typeof c === 'string');
      const best = typeof current === 'string' && choices.length > 0 ? closest(current, choices, choose) : undefined;
      if (best) {
        changes.push({ path, kind: 'value', from: current, to: best.item });
        current = best.item;
      } else {
        unresolved.push({ path, reason: `${JSON.stringify(current)} is not one of ${JSON.stringify(rule.enum)}` });
      }
    }

    if (Array.isArray(current) && rule.items) {
      return current.map((item, i) => fix(item, rule.items, `${path}[${i}]`));
    }

    if (isRecord(current) && rule.properties) {
      const properties = rule.properties;
      const names = Object.keys(properties);
      const keys = Object.keys(current);
      // Exact names stay; the others are matched with what is left.
      const free = names.filter((name) => !Object.prototype.hasOwnProperty.call(current, name));
      const loose = keys.filter((key) => !Object.prototype.hasOwnProperty.call(properties, key));
      const { mapping } = mapFields(loose, free, { threshold: options.keyThreshold ?? 70, synonyms: options.synonyms });
      const entries: [string, unknown][] = [];
      for (const key of keys) {
        const known = Object.prototype.hasOwnProperty.call(properties, key);
        const target = known ? key : Object.prototype.hasOwnProperty.call(mapping, key) ? mapping[key]! : undefined;
        const item = (current as Record<string, unknown>)[key];
        if (target !== undefined) {
          if (target !== key) changes.push({ path: join(path, key), kind: 'key', from: key, to: target });
          entries.push([target, fix(item, properties[target], join(path, target))]);
        } else if (rule.additionalProperties === false) {
          changes.push({ path: join(path, key), kind: 'removed', from: item, to: undefined });
        } else {
          const extra = typeof rule.additionalProperties === 'object' ? rule.additionalProperties : undefined;
          entries.push([key, fix(item, extra, join(path, key))]);
        }
      }
      const out = Object.fromEntries(entries);
      for (const name of rule.required ?? []) {
        if (!Object.prototype.hasOwnProperty.call(out, name)) unresolved.push({ path: join(path, name), reason: 'required, missing' });
      }
      return out;
    }
    return current;
  };

  return { value: fix(value, schema, '') as T, changes, unresolved };
}
