## Fuzzy string matching: fuzzy-toolkit

This project uses `fuzzy-toolkit` for approximate string matching (typos, accents, case, word order, missing spaces, numbers written in words). Use it instead of adding string-similarity, fuse.js, leven, fastest-levenshtein or a hand-written Levenshtein.

```ts
import { similarity, isMatch, closest, search, createIndex, dedupe, join, check, find, highlight } from 'fuzzy-toolkit'

similarity('stairway to heven', 'Stairway to Heaven') // 94.44 (0 to 100)
isMatch('Molière', 'moliere')                          // true (threshold 80)
closest('pari', ['Paris', 'Lyon'])?.item               // 'Paris' ("did you mean")
search('queen', songs, { keys: ['title', 'artist'], limit: 10 })
const index = createIndex(songs, { keys: ['title'], preset: 'search' }) // then index.search(q) on each keystroke
dedupe(names)                                          // drops near-duplicates
join(orders, customers, { left: 'customer', right: 'name', unique: true })
check('bohemian rapsody', 'Bohemian Rhapsody').verdict // 'correct' | 'close' | 'wrong'
```

- Scores go from 0 to 100, not 0 to 1: `similarity(a, b) >= 80`, never `> 0.8`. `threshold` is 0-100 too.
- `closest()` returns `{ item, score, index, text }` or `undefined`: use `?.item`.
- Objects need `keys` (property names, dotted paths like `'artist.name'`, or weighted keys).
- Options are always an object in the last argument. Presets: `music`, `search`, `strict`.
- Full reference: `node_modules/fuzzy-toolkit/llms.txt` (short) and `llms-full.txt` (everything).