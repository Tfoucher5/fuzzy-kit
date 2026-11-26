#!/usr/bin/env node
// Command line interface: fuzzy dedupe, join, search and compare on CSV, TSV,
// JSON or plain text files. Run `npx guess-rater --help`.
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { createMatcher, dedupe, group, join, search } from '../dist/esm/index.js';

const HELP = `guess-rater: fuzzy matching from the command line

Usage
  guess-rater dedupe  <file>                 Remove near-duplicate rows
  guess-rater group   <file>                 Add a "group" column numbering near-duplicates
  guess-rater join    <left> <right>         Add to each left row its best match on the right
  guess-rater search  <query> <file>         Rows matching a query, best first
  guess-rater compare <a> <b>                Score two texts and show how they were read

Files can be CSV (comma, semicolon or tab, detected), .json (an array) or
plain text (one item per line). Use - to read from standard input.
Results go to standard output, in the input format (CSV or JSON).

Options
  -k, --key <column>        Column holding the text (default: the first one).
                            Repeat it to use several columns.
      --left-key <column>   join: column of the left file
      --right-key <column>  join: column of the right file
      --unique              join: use each right row at most once
  -t, --threshold <0-100>   Minimum score to match (default 80)
  -p, --preset <name>       music, search or strict
      --phonetic            Also match texts that sound the same
  -i, --ignore <word>       Word to ignore (repeatable), e.g. -i inc -i ltd
  -l, --limit <n>           search: maximum number of results (default 10)
      --json                Write JSON instead of CSV
  -h, --help                Show this help

Examples
  npx guess-rater dedupe customers.csv -k name -i sarl -i sas > clean.csv
  npx guess-rater join orders.csv clients.csv --left-key client --right-key name --unique
  npx guess-rater search "bohemian rapsody" songs.csv -k title -k artist
  npx guess-rater compare "The Beatles" "beatles" -p music
`;

function fail(message) {
  process.stderr.write(`guess-rater: ${message}\nRun "guess-rater --help" for usage.\n`);
  process.exit(1);
}

/* ---------------------------------------------------------------------- */
/* Reading and writing                                                     */
/* ---------------------------------------------------------------------- */

function detectDelimiter(text) {
  const firstLine = text.slice(0, text.indexOf('\n') >>> 0);
  let best = ',';
  let count = 0;
  for (const d of [',', ';', '\t']) {
    const n = firstLine.split(d).length - 1;
    if (n > count) [best, count] = [d, n];
  }
  return best;
}

/** RFC 4180 CSV: quoted fields, doubled quotes, newlines inside quotes. */
function parseCsv(text, delimiter = detectDelimiter(text)) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return { rows: rows.filter((r) => r.length > 1 || r[0] !== ''), delimiter };
}

function csvField(value, delimiter) {
  const text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /["\n\r]/.test(text) || text.includes(delimiter) ? `"${text.replace(/"/g, '""')}"` : text;
}

function readInput(path) {
  let text;
  try {
    text = readFileSync(path === '-' ? 0 : path, 'utf8');
  } catch (error) {
    fail(`cannot read "${path}" (${error.code ?? error.message})`);
  }
  text = text.replace(/^﻿/, '');
  if (/\.json$/i.test(path) || (path === '-' && /^\s*\[/.test(text))) {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) fail(`"${path}" must contain a JSON array`);
    const rows = data.map((item) => (item !== null && typeof item === 'object' ? item : { text: String(item) }));
    const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const strings = data.every((item) => item === null || typeof item !== 'object');
    return { format: 'json', rows, columns, strings };
  }
  const csv = /\.[ct]sv$/i.test(path);
  if (!csv && (/\.txt$/i.test(path) || !/[,;\t]/.test(text.slice(0, text.indexOf('\n') >>> 0)))) {
    const rows = text
      .split(/\r?\n/)
      .filter((line) => line.trim() !== '')
      .map((line) => ({ text: line }));
    return { format: 'text', rows, columns: ['text'] };
  }
  const { rows: table, delimiter } = parseCsv(text);
  const [header = [], ...body] = table;
  const columns = header.map((name, i) => name.trim() || `column${i + 1}`);
  const rows = body.map((cells) => Object.fromEntries(columns.map((name, i) => [name, cells[i] ?? ''])));
  return { format: 'csv', rows, columns, delimiter };
}

function write(rows, columns, input, json) {
  if (json || input.format === 'json') {
    const data = input.strings && columns.length === 1 ? rows.map((row) => row.text) : rows;
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    return;
  }
  if (input.format === 'text' && columns.length === 1) {
    process.stdout.write(rows.map((row) => row[columns[0]]).join('\n') + (rows.length ? '\n' : ''));
    return;
  }
  const d = input.delimiter ?? ',';
  const lines = [columns.map((c) => csvField(c, d)).join(d)];
  for (const row of rows) lines.push(columns.map((c) => csvField(row[c], d)).join(d));
  process.stdout.write(`${lines.join('\n')}\n`);
}

function keysFor(input, wanted, label = 'key') {
  const keys = wanted?.length ? wanted : [input.columns[0]];
  for (const key of keys) {
    if (key === undefined || !input.columns.includes(key)) {
      fail(`no column "${key}" (${label}). Columns: ${input.columns.join(', ')}`);
    }
  }
  return keys;
}

/* ---------------------------------------------------------------------- */
/* Commands                                                                */
/* ---------------------------------------------------------------------- */

const { values, positionals } = (() => {
  try {
    return parseArgs({
      allowPositionals: true,
      options: {
        key: { type: 'string', short: 'k', multiple: true },
        'left-key': { type: 'string', multiple: true },
        'right-key': { type: 'string', multiple: true },
        unique: { type: 'boolean' },
        threshold: { type: 'string', short: 't' },
        preset: { type: 'string', short: 'p' },
        phonetic: { type: 'boolean' },
        ignore: { type: 'string', short: 'i', multiple: true },
        limit: { type: 'string', short: 'l' },
        json: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
    });
  } catch (error) {
    return fail(error.message);
  }
})();

const [command, ...args] = positionals;
if (values.help || !command) {
  process.stdout.write(HELP);
  process.exit(0);
}

const options = {};
if (values.preset) options.preset = values.preset;
if (values.phonetic) options.phonetic = true;
if (values.ignore) options.ignoreWords = values.ignore;
if (values.threshold !== undefined) {
  const t = Number(values.threshold);
  if (!Number.isFinite(t) || t < 0 || t > 100) fail('--threshold must be a number between 0 and 100');
  options.threshold = t;
}

try {
  switch (command) {
    case 'compare': {
      if (args.length !== 2) fail('compare needs two texts');
      const result = createMatcher(options).compare(args[0], args[1]);
      if (values.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      else {
        process.stdout.write(
          `score      ${result.score} (${result.match ? 'match' : 'no match'}, threshold ${result.threshold})\n` +
            `a          "${result.a}"\nb          "${result.b}"\n` +
            Object.entries(result.scores)
              .map(([name, score]) => `${name.padEnd(10)} ${score}\n`)
              .join(''),
        );
      }
      break;
    }
    case 'dedupe':
    case 'group': {
      if (args.length !== 1) fail(`${command} needs one file`);
      const input = readInput(args[0]);
      const keys = keysFor(input, values.key);
      if (command === 'dedupe') {
        write(dedupe(input.rows, { ...options, keys }), input.columns, input, values.json);
      } else {
        const groups = group(input.rows, { ...options, keys });
        const id = new Map();
        groups.forEach((members, i) => members.forEach((row) => id.set(row, i + 1)));
        const rows = input.rows.map((row) => ({ group: id.get(row), ...row }));
        write(rows, ['group', ...input.columns], input, values.json);
      }
      break;
    }
    case 'join': {
      if (args.length !== 2) fail('join needs two files');
      const left = readInput(args[0]);
      const right = readInput(args[1]);
      const leftKeys = keysFor(left, values['left-key'] ?? values.key, 'left-key');
      const rightKeys = keysFor(right, values['right-key'] ?? values.key, 'right-key');
      const result = join(left.rows, right.rows, { ...options, left: leftKeys, right: rightKeys, unique: values.unique });
      // Right columns that clash with left ones get a "right_" prefix.
      const rename = new Map(right.columns.map((c) => [c, left.columns.includes(c) ? `right_${c}` : c]));
      const rows = result.map(({ item, match }) => {
        const row = { ...item };
        for (const c of right.columns) row[rename.get(c)] = match ? match.item[c] : '';
        row.score = match ? match.score : '';
        return row;
      });
      write(rows, [...left.columns, ...rename.values(), 'score'], left, values.json);
      break;
    }
    case 'search': {
      if (args.length !== 2) fail('search needs a query and a file');
      const input = readInput(args[1]);
      const keys = keysFor(input, values.key);
      const limit = values.limit === undefined ? 10 : Number(values.limit);
      if (!Number.isInteger(limit) || limit < 1) fail('--limit must be a positive whole number');
      const matches = search(args[0], input.rows, { ...options, keys, limit });
      const rows = matches.map((m) => ({ score: m.score, ...m.item }));
      write(rows, ['score', ...input.columns], input, values.json);
      break;
    }
    default:
      fail(`unknown command "${command}"`);
  }
} catch (error) {
  fail(error instanceof Error ? error.message.replace(/^\[guess-rater\] /, '') : String(error));
}
