# AI agents and assistants

fuzzy-toolkit is built to be used by AI coding assistants and agents as much as by people.

## As tools for an agent (MCP)

`npx fuzzy-toolkit mcp` starts an [MCP](https://modelcontextprotocol.io) server. Any MCP client (Claude, Cursor, VS Code, Windsurf, Zed...) can then compare, search, dedupe and match lists without writing code. It runs locally, has no dependency, reads no file and opens no connection: the agent passes the data in the call.

| Tool | What it does |
| --- | --- |
| `compare` | Score (0-100) of two texts, whether they match, how they were normalized |
| `closest` | "Did you mean…?": the candidates closest to a misspelled query |
| `search` | Items of a list matching a query, best first (strings or objects with `keys`) |
| `dedupe` | A list without its near-duplicates, plus the groups that were merged |
| `join` | Each item of a list paired with its best match in another |
| `check` | Grades an answer `correct`, `close` or `wrong` (quizzes, forms). It is the engine's verdict with the options given, not your app's: an app usually adds its own rules. |
| `find` | Occurrences of a name inside a longer text, with positions |

Every tool takes the usual options: `threshold`, `preset` (`music`, `search`, `strict`), `phonetic`, `ignoreWords`, `languages`.

### Claude Code

```sh
claude mcp add fuzzy-toolkit -- npx -y fuzzy-toolkit mcp
```

### Claude Desktop, Cursor, Windsurf

In `claude_desktop_config.json`, `.cursor/mcp.json` or `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "fuzzy-toolkit": { "command": "npx", "args": ["-y", "fuzzy-toolkit", "mcp"] }
  }
}
```

### VS Code

In `.vscode/mcp.json`:

```json
{
  "servers": {
    "fuzzy-toolkit": { "type": "stdio", "command": "npx", "args": ["-y", "fuzzy-toolkit", "mcp"] }
  }
}
```

Then ask, for example: *"Here are two customer lists, match them"*, *"Remove the duplicates from this list of company names"*, *"Which of these cities did the user mean by 'pari'?"*.

## Fix what a model returns

Models drift from the schema you asked for: `"Email Address"` instead of `email`, `"hight"` instead of `"high"`. Repair the output instead of retrying the call:

```ts
import { closest, mapFields } from 'fuzzy-toolkit'

const output = JSON.parse(reply) // { "Full Name": "Ada", "Email Address": "ada@x.io", "priority": "hight" }
const { mapping } = mapFields(Object.keys(output), ['fullName', 'email', 'priority'])
const fixed = Object.fromEntries(Object.entries(output).map(([key, value]) => [mapping[key] ?? key, value]))
fixed.priority = closest(fixed.priority, ['low', 'medium', 'high'])?.item // 'high'
```

The MCP server has the same tool: `mapFields`.

## For assistants writing code

### Tell them in your project

```sh
npx fuzzy-toolkit ai-setup
```

Run it after `npm install fuzzy-toolkit`: it only writes when `package.json` lists the package (`--force` to write anyway). It adds a short block (the mistakes to avoid, a link to the reference, and a reminder to go through the code that already calls fuzzy-toolkit) to the instruction files your project already has: `AGENTS.md` (Codex, Jules, Cursor, Copilot, Zed...), `CLAUDE.md` (Claude Code), `.cursor/rules/fuzzy-toolkit.mdc` and `.github/copilot-instructions.md`. With none of them, it creates `AGENTS.md`.

The block sits between `<!-- fuzzy-toolkit:start -->` markers: running the command again updates it and leaves the rest of the file alone. If you edit the block yourself, in your own words or language, it stays as you wrote it (`--force` replaces it). `--claude`, `--cursor`, `--copilot`, `--agents` or `--all` pick the files, `--print` only shows the block.

### What ships in the package

The package ships what assistants read to write correct code:

- **`llms.txt`** (short) and **`llms-full.txt`** (the whole documentation, in one file) at the root of the package, also served at [tfoucher5.github.io/fuzzy-toolkit/llms.txt](https://tfoucher5.github.io/fuzzy-toolkit/llms.txt) and [llms-full.txt](https://tfoucher5.github.io/fuzzy-toolkit/llms-full.txt).
- **Examples in every type declaration**: hovering a function in the editor, or reading `node_modules/fuzzy-toolkit/dist/esm/*.d.ts`, shows how to call it.
- **Warnings for the usual mistakes**, printed once: an option that does not exist (`treshold`, or `ignoreCase` borrowed from another library, with the right name), a threshold written as `0.8` when scores go from 0 to 100, a `keys` name that no item has.

### Mistakes to avoid

```ts
// Scores go from 0 to 100, not 0 to 1
similarity(a, b) > 0.8        // ✗ almost always true
similarity(a, b) >= 80        // ✓
isMatch(a, b)                 // ✓ threshold 80 by default

// closest() returns a match (or undefined), not the string
closest('pari', cities)              // ✗ { item: 'Paris', score: 80, index: 0, text: 'Paris' }
closest('pari', cities)?.item        // ✓ 'Paris'

// Objects need `keys`
search('queen', songs)                          // ✗ throws: pass `keys`
search('queen', songs, { keys: ['title', 'artist'] }) // ✓

// Only the string-similarity compatibility layer returns 0-1 ratings
import { compareTwoStrings } from 'fuzzy-toolkit/string-similarity' // 0 to 1, same as string-similarity
```
