---
title: "Cleaning data: dedupe, record linkage, column mapping"
description: "Remove near-duplicates, match two lists of customers or products (record linkage), map messy values and CSV headers to a clean schema in JavaScript."
---

# Cleaning data

## Remove near-duplicates

`dedupe()` keeps the first occurrence of each group of similar items.

```ts
import { dedupe } from 'fuzzy-toolkit'

dedupe(['Hey Jude', 'hey jude - Remastered 2015', 'Let It Be'], { preset: 'music' })
// ['Hey Jude', 'Let It Be']

dedupe(companies, { keys: 'name', ignoreWords: ['sarl', 'sas', 'inc', 'ltd'] })
```

## See the groups

`group()` returns every group, in the original order, so you can review before merging.

```ts
import { group } from 'fuzzy-toolkit'

group(['Jean Dupont', 'Dupont Jean', 'J. Dupont', 'Marie Curie'], { threshold: 70 })
```

An item joins the first group whose first item it matches.

## Match two lists

`join()` pairs each row of one list with its best match in another: two exports of the same customers, free-text input against a reference list, two catalogs to merge.

```ts
import { join } from 'fuzzy-toolkit'

join(['Apple Inc.', 'Microsoft Corp', 'Nokia'], ['MICROSOFT CORPORATION', 'Apple', 'Google LLC'], {
  ignoreWords: ['inc', 'corp', 'corporation', 'llc'],
})
// [
//   { item: 'Apple Inc.', index: 0, match: { item: 'Apple', score: 100, ... } },
//   { item: 'Microsoft Corp', index: 1, match: { item: 'MICROSOFT CORPORATION', score: 100, ... } },
//   { item: 'Nokia', index: 2, match: undefined },
// ]
```

With objects, say where the text is on each side with `left` and `right`. Add `unique: true` so each right item is used at most once: when two rows want the same one, the better match gets it and the other takes its next best choice.

```ts
const rows = join(orders, customers, { left: 'customerName', right: 'name', unique: true })
const unmatched = rows.filter((row) => !row.match)
```

## Map columns to your schema

::: tip New in 2.8.0
Not on npm yet: it comes with the next release.
:::

A CSV export never names its columns like your code does. `mapFields` pairs them, reading camelCase, snake_case and synonyms (zip and postal code, dob and date of birth, prénom and first name), and tells you what it could not place:

```ts
import { mapFields } from 'fuzzy-toolkit'

const { mapping, unmatched, missing } = mapFields(headers, ['firstName', 'lastName', 'email', 'postalCode', 'phoneNumber'])
// headers ['Prénom', 'NOM', 'E-mail', 'Zip', 'Tel.'] → { Prénom: 'firstName', NOM: 'lastName', 'E-mail': 'email', Zip: 'postalCode', 'Tel.': 'phoneNumber' }
if (missing.length) console.warn('Columns not found:', missing)
const records = rows.map((row) => Object.fromEntries(Object.entries(mapping).map(([from, to]) => [to, row[from]])))
```

Words of your own domain go in `synonyms`: `mapFields(headers, fields, { synonyms: { sku: ['ref', 'item code'] } })`.

## Map messy values to a clean list

```ts
import { createMatcher } from 'fuzzy-toolkit'

const country = createMatcher({ replace: { usa: 'united states', uk: 'united kingdom' } })
const clean = rows.map((row) => country.closest(row.country, COUNTRIES)?.item ?? null)
```
