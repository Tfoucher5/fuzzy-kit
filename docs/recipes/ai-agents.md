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
| `check` | Grades an answer `correct`, `close` or `wrong` (quizzes, forms) |
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

## For assistants writing code

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
