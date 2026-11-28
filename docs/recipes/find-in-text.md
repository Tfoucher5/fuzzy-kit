---
title: "Find names in a text, typos included"
description: "Spot a title, a product or a person mentioned with typos inside a message, a paragraph or a transcript, with positions and scores."
---

# Spot names in a text

`find()` looks for fuzzy occurrences of a query inside a longer text and tells you where they are.

```ts
import { find } from 'fuzzy-toolkit'

find("je crois que c'est bohemian rapsody de queen", 'Bohemian Rhapsody')
// [{ text: 'bohemian rapsody', start: 19, end: 35, score: 94.12 }]
```

Positions refer to the original text, so `message.slice(start, end)` is exactly what was written.

## Ideas

- **Chat games**: accept an answer typed in the middle of a sentence.
- **Moderation**: catch a banned word written with typos or accents.
- **Mentions**: detect a product, a city or a person in reviews or support tickets.
- **Tagging**: list which known names appear in an article.

## Every known name at once

*Since 2.8.0.*

`findAll()` looks for all the items of a list in one pass and says which part of the text goes with which item. A longer name wins over its parts: "hotel californa" is Hotel California, not Hotel and California.

```ts
import { findAll } from 'fuzzy-toolkit'

findAll('2 iphone 15 et un macbok air svp', ['iPhone 15', 'MacBook Air', 'iPad'])
// [{ item: 'iPhone 15', index: 0, text: 'iphone 15', start: 2, end: 11, score: 100 },
//  { item: 'MacBook Air', index: 1, text: 'macbok air', start: 18, end: 28, score: 90.91 }]

// Objects, with their aliases
findAll(message, cities, { keys: ['name', 'aliases'] }) // each result has the key that matched
```

With a long list of short, common names (thousands of song titles), raise the `threshold` to 90: common words in the text would otherwise match short titles.

## Highlight them

`highlight()` uses the same matching and returns pieces ready to render:

```ts
import { highlight } from 'fuzzy-toolkit'

highlight("c'est bohemian rapsody", 'Bohemian Rhapsody')
// [{ text: "c'est ", match: false }, { text: 'bohemian rapsody', match: true }]
```

## Tuning

`find()` takes the usual options. Use a `threshold` of 90 or more to avoid near misses on short words, and `preset: 'music'` when the query is a song title.
