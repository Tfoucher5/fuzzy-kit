// MCP server (Model Context Protocol) over stdio, with no dependency: lets AI
// agents such as Claude, Cursor or VS Code call fuzzy-toolkit as tools.
//
//   { "mcpServers": { "fuzzy-toolkit": { "command": "npx", "args": ["-y", "fuzzy-toolkit", "mcp"] } } }
//
// Messages are JSON-RPC 2.0, one per line. Everything runs in memory: the
// tools read no file and open no connection.
import { readFileSync } from 'node:fs';
import { check, checkAll, closest, compare, find, group, join, mapFields, search } from '../dist/esm/index.js';
import de from '../dist/esm/lang/de.js';
import es from '../dist/esm/lang/es.js';
import it from '../dist/esm/lang/it.js';
import nl from '../dist/esm/lang/nl.js';

const PACKS = { es, de, it, nl };

const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

const INSTRUCTIONS = `Fuzzy string matching tools: they forgive typos, accents, case, punctuation, word order, missing spaces and numbers written in words ("two" = "2").
Scores go from 0 (nothing in common) to 100 (identical once normalized); the default match threshold is 80.
Use the "music" preset for song titles and artists, "search" for search-as-you-type and prefixes, "strict" for codes and references.
To write code instead, install the library: npm install fuzzy-toolkit (same functions: compare, closest, search, dedupe, join, check, find, mapFields).`;

/* ---------------------------------------------------------------------- */
/* Tools                                                                   */
/* ---------------------------------------------------------------------- */

const TEXT_LIST = (description) => ({
  type: 'array',
  description,
  items: { anyOf: [{ type: 'string' }, { type: 'object' }] },
});

const KEYS = {
  type: 'array',
  items: { type: 'string' },
  description: 'When items are objects: the properties holding their text, e.g. ["title", "artist"]. Dotted paths work: "author.name".',
};

/** Options shared by every tool, passed through to the library. */
const OPTIONS = {
  threshold: { type: 'number', minimum: 0, maximum: 100, description: 'Minimum score (0-100) to count as a match. Default 80.' },
  preset: {
    type: 'string',
    enum: ['music', 'search', 'strict'],
    description: 'music: song titles and artists (drops "feat.", "- Remastered", "(Live)"); search: as-you-type, prefixes and partial words; strict: codes, references.',
  },
  substring: { type: 'boolean', description: 'Also match from inside a word ("phone" finds "iPhone", "ville" finds "Belleville"), for search. Default false.' },
  phonetic: { type: 'boolean', description: 'Also match texts that sound the same ("Filip" / "Philippe"). Default false.' },
  ignoreWords: { type: 'array', items: { type: 'string' }, description: 'Whole words to ignore, e.g. ["inc", "ltd", "sarl"].' },
  languages: {
    type: 'array',
    items: { type: 'string', enum: ['en', 'fr', 'es', 'de', 'it', 'nl'] },
    description: 'Languages for numbers written in words, articles and sounds. Default ["en", "fr"].',
  },
};

function optionsFrom(args) {
  const options = {};
  for (const name of Object.keys(OPTIONS)) if (args[name] !== undefined) options[name] = args[name];
  if (Array.isArray(options.languages)) options.languages = options.languages.map((code) => PACKS[code] ?? code);
  return options;
}

function keysFor(items, keys, name = 'keys') {
  if (keys?.length) return keys;
  if (items.some((item) => item !== null && typeof item === 'object')) {
    throw new Error(`The items are objects: pass "${name}" with the properties that hold their text, e.g. ["name"].`);
  }
  return undefined;
}

const tool = (name, title, description, properties, required, run) => ({
  definition: {
    name,
    title,
    description,
    inputSchema: { type: 'object', properties: { ...properties, ...OPTIONS }, required, additionalProperties: false },
    annotations: { title, readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  run,
});

const TOOLS = [
  tool(
    'compare',
    'Compare two texts',
    'Similarity score (0-100) of two texts, whether they match, how each was normalized and the score of each strategy. Use it to decide if two names, titles or answers are the same thing despite typos, accents, word order or formatting.',
    { a: { type: 'string', description: 'First text.' }, b: { type: 'string', description: 'Second text.' } },
    ['a', 'b'],
    (args) => compare(args.a, args.b, optionsFrom(args)),
  ),
  tool(
    'closest',
    'Did you mean',
    'The candidates closest to a query, best first: "did you mean...?" suggestions, mapping a misspelled input to a known value (a city, a command, a product, a column name).',
    {
      query: { type: 'string', description: 'The text to look up, possibly misspelled.' },
      candidates: TEXT_LIST('Known values to choose from: strings, or objects with "keys".'),
      keys: KEYS,
      limit: { type: 'integer', minimum: 1, description: 'Maximum number of suggestions. Default 3.' },
    },
    ['query', 'candidates'],
    (args) => {
      const keys = keysFor(args.candidates, args.keys);
      const matches = search(args.query, args.candidates, { ...optionsFrom(args), keys, limit: args.limit ?? 3 });
      return { best: matches[0] ?? null, suggestions: matches };
    },
  ),
  tool(
    'search',
    'Fuzzy search',
    'Items of a list matching a query, best first, typos included. For objects, pass the properties to search in "keys". Use preset "search" for prefixes and partial words.',
    {
      query: { type: 'string', description: 'What to look for.' },
      items: TEXT_LIST('The list to search: strings, or objects with "keys".'),
      keys: KEYS,
      limit: { type: 'integer', minimum: 1, description: 'Maximum number of results. Default 10.' },
    },
    ['query', 'items'],
    (args) => {
      const keys = keysFor(args.items, args.keys);
      return search(args.query, args.items, { ...optionsFrom(args), keys, limit: args.limit ?? 10 });
    },
  ),
  tool(
    'dedupe',
    'Remove near-duplicates',
    'Finds near-duplicates in a list ("Jean Dupont" / "Dupont Jean" / "jean dupond") and returns the list without them, keeping the first of each, plus the groups that were merged so you can review them.',
    { items: TEXT_LIST('The list to clean: strings, or objects with "keys".'), keys: KEYS },
    ['items'],
    (args) => {
      const keys = keysFor(args.items, args.keys);
      const groups = group(args.items, { ...optionsFrom(args), keys });
      return {
        unique: groups.map((g) => g[0]),
        removed: args.items.length - groups.length,
        duplicateGroups: groups.filter((g) => g.length > 1),
      };
    },
  ),
  tool(
    'join',
    'Match two lists',
    'Pairs each item of "left" with its best match in "right" (null when none reaches the threshold): reconcile two exports, map free-text input to a reference list, merge two catalogs.',
    {
      left: TEXT_LIST('Items to match: strings, or objects with "leftKeys".'),
      right: TEXT_LIST('Reference list: strings, or objects with "rightKeys".'),
      leftKeys: { ...KEYS, description: 'When left items are objects: the properties holding their text.' },
      rightKeys: { ...KEYS, description: 'When right items are objects: the properties holding their text.' },
      unique: { type: 'boolean', description: 'Use each right item at most once (one-to-one). Default false.' },
    },
    ['left', 'right'],
    (args) => {
      const options = {
        ...optionsFrom(args),
        left: keysFor(args.left, args.leftKeys, 'leftKeys'),
        right: keysFor(args.right, args.rightKeys, 'rightKeys'),
        unique: args.unique,
      };
      return join(args.left, args.right, options).map(({ item, match }) => ({
        item,
        match: match ? match.item : null,
        score: match ? match.score : null,
      }));
    },
  ),
  tool(
    'check',
    'Grade an answer',
    'Grades a guess against the accepted answer(s): "correct", "close" (almost) or "wrong". This is the engine\'s verdict with these options, not the verdict of a given app: apps add their own rules (thresholds, required parts, extra normalization), so do not tell a user their app will accept an answer because this tool says "correct". For a guess naming several things at once (a title and an artist), pass "answers" as an object such as {"title": "Bohemian Rhapsody", "artist": "Queen"}.',
    {
      guess: { type: 'string', description: 'What was typed or said.' },
      answers: {
        anyOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } },
          { type: 'object', additionalProperties: { anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] } },
        ],
        description: 'The accepted answer, several accepted answers, or an object of named parts to find in the guess.',
      },
      closeThreshold: { type: 'number', minimum: 0, maximum: 100, description: 'Minimum score for "close". Default threshold - 15.' },
    },
    ['guess', 'answers'],
    (args) => {
      const options = { ...optionsFrom(args), closeThreshold: args.closeThreshold };
      if (options.closeThreshold === undefined) delete options.closeThreshold;
      return args.answers !== null && typeof args.answers === 'object' && !Array.isArray(args.answers)
        ? checkAll(args.guess, args.answers, options)
        : check(args.guess, args.answers, options);
    },
  ),
  tool(
    'find',
    'Find in text',
    'Fuzzy occurrences of a name or phrase inside a longer text (a message, a paragraph, a transcript), with their positions and scores. Detects a title, a product or a person mentioned with typos.',
    {
      text: { type: 'string', description: 'The text to look in.' },
      query: { type: 'string', description: 'The name or phrase to find.' },
    },
    ['text', 'query'],
    (args) => find(args.text, args.query, optionsFrom(args)),
  ),
  fieldsTool(),
];

// Field names have no preset or language: only the threshold applies.
function fieldsTool() {
  const t = tool(
    'mapFields',
    'Map fields to a schema',
    'Pairs field names with the fields of a schema, one to one: CSV or spreadsheet headers to your columns, the keys of a JSON object (from an API or an AI) to the expected ones. Reads camelCase, snake_case and kebab-case and common synonyms (zip = postal code, dob = date of birth, qty = quantity, French and Spanish names too). Returns the mapping, the fields left unmatched and the schema fields missing.',
    {
      from: { type: 'array', items: { type: 'string' }, description: 'Field names to map, such as CSV headers.' },
      to: { type: 'array', items: { type: 'string' }, description: 'The expected field names (the schema).' },
      synonyms: {
        type: 'object',
        additionalProperties: { type: 'array', items: { type: 'string' } },
        description: 'More words that mean the same, such as {"sku": ["ref", "item code"]}.',
      },
    },
    ['from', 'to'],
    (args) => mapFields(args.from, args.to, { threshold: args.threshold, synonyms: args.synonyms }),
  );
  const { threshold } = t.definition.inputSchema.properties;
  t.definition.inputSchema.properties = { ...t.definition.inputSchema.properties, threshold: { ...threshold, description: 'Minimum score (0-100) to pair two fields. Default 70.' } };
  for (const name of Object.keys(OPTIONS)) if (name !== 'threshold') delete t.definition.inputSchema.properties[name];
  return t;
}

const BY_NAME = new Map(TOOLS.map((t) => [t.definition.name, t]));

/* ---------------------------------------------------------------------- */
/* JSON-RPC                                                                */
/* ---------------------------------------------------------------------- */

class RpcError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/** Checks the arguments against the tool's schema: required, types, enums, ranges. */
function validate(definition, args) {
  const { properties, required } = definition.inputSchema;
  for (const name of required) {
    if (args[name] === undefined) throw new Error(`Missing argument "${name}".`);
  }
  for (const [name, value] of Object.entries(args)) {
    const schema = properties[name];
    if (!schema) throw new Error(`Unknown argument "${name}". Arguments: ${Object.keys(properties).join(', ')}.`);
    if (value === undefined) continue;
    const ok = (s, v) => {
      if (s.anyOf) return s.anyOf.some((sub) => ok(sub, v));
      if (s.type === 'string') return typeof v === 'string' && (!s.enum || s.enum.includes(v));
      if (s.type === 'boolean') return typeof v === 'boolean';
      if (s.type === 'number' || s.type === 'integer') {
        return typeof v === 'number' && Number.isFinite(v) && (s.type === 'number' || Number.isInteger(v)) &&
          (s.minimum === undefined || v >= s.minimum) && (s.maximum === undefined || v <= s.maximum);
      }
      if (s.type === 'array') return Array.isArray(v) && (!s.items || v.every((x) => ok(s.items, x)));
      if (s.type === 'object') return v !== null && typeof v === 'object' && !Array.isArray(v);
      return true;
    };
    if (!ok(schema, value)) throw new Error(`Invalid argument "${name}": ${schema.description ?? 'wrong type'}`);
  }
}

function callTool(params) {
  const entry = BY_NAME.get(params?.name);
  if (!entry) throw new RpcError(-32602, `Unknown tool "${params?.name}". Tools: ${[...BY_NAME.keys()].join(', ')}.`);
  const args = params.arguments ?? {};
  try {
    validate(entry.definition, args);
    const result = entry.run(args);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  } catch (error) {
    const message = error instanceof Error ? error.message.replace(/^\[fuzzy-toolkit\] /, '') : String(error);
    return { content: [{ type: 'text', text: message }], isError: true };
  }
}

/** Answers one request; returns undefined for notifications. */
export function handle(message) {
  const { id, method, params } = message ?? {};
  const isRequest = id !== undefined && id !== null;
  try {
    if (typeof method !== 'string') throw new RpcError(-32600, 'Invalid request');
    let result;
    switch (method) {
      case 'initialize': {
        const asked = params?.protocolVersion;
        result = {
          protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'fuzzy-toolkit', title: 'fuzzy-toolkit', version: VERSION },
          instructions: INSTRUCTIONS,
        };
        break;
      }
      case 'ping':
        result = {};
        break;
      case 'tools/list':
        result = { tools: TOOLS.map((t) => t.definition) };
        break;
      case 'tools/call':
        result = callTool(params);
        break;
      default:
        if (!isRequest) return undefined; // notifications/initialized, notifications/cancelled...
        throw new RpcError(-32601, `Method not found: ${method}`);
    }
    return isRequest ? { jsonrpc: '2.0', id, result } : undefined;
  } catch (error) {
    if (!isRequest) return undefined;
    const code = error instanceof RpcError ? error.code : -32603;
    return { jsonrpc: '2.0', id, error: { code, message: error.message } };
  }
}

/** Reads JSON-RPC messages from stdin, one per line, and writes answers to stdout. */
export function serve(input = process.stdin, output = process.stdout) {
  let buffer = '';
  const reply = (answer) => {
    if (answer !== undefined) output.write(`${JSON.stringify(answer)}\n`);
  };
  input.setEncoding('utf8');
  input.on('data', (chunk) => {
    buffer += chunk;
    let newline;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line === '') continue;
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        reply({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
        continue;
      }
      if (Array.isArray(message)) {
        const answers = message.map(handle).filter((a) => a !== undefined);
        if (answers.length) reply(answers);
      } else reply(handle(message));
    }
  });
  input.on('end', () => process.exit(0));
}
