---
title: "Command line: dedupe, join and clean CSV files"
description: "Remove near-duplicate rows, match two spreadsheets, rename columns and search a CSV or JSON file from the terminal with npx, no code."
---

# Command line

Dedupe a customer export, match two spreadsheets, or try a score, without writing code. Works with `npx`, nothing to install.

```sh
npx fuzzy-toolkit --help
```

## Input and output

- **CSV**, with commas, semicolons (Excel in French) or tabs, detected from the first line. The first line holds column names.
- **JSON**: an array of strings or of objects.
- **Plain text**: one item per line.
- `-` reads standard input.

Results are written to standard output in the same format, so you can redirect them: `> clean.csv`. Add `--json` for JSON.

## Remove duplicates

```sh
npx fuzzy-toolkit dedupe customers.csv -k name -i sarl -i sas > clean.csv
```

`-k` names the column to compare (the first one by default; repeat it to use several). `-i` ignores a word, such as a legal form. The first row of each group of near-duplicates is kept.

To review before deleting, `group` adds a `group` column instead: rows with the same number are duplicates of each other.

```sh
npx fuzzy-toolkit group customers.csv -k name
```

## Match two files

```sh
npx fuzzy-toolkit join orders.csv customers.csv --left-key client --right-key name --unique
```

Each row of `orders.csv` gets the columns of its best match in `customers.csv`, plus a `score` column. Rows with no match keep empty columns. `--unique` uses each customer at most once. Right columns with the same name as a left column are prefixed with `right_`.

## Rename columns to your names

*Since 2.8.0.*

A CSV export never names its columns like your code does. `map-fields` renames them, reading camelCase, snake_case and synonyms (zip and postal code, prénom and first name), and puts them in your order:

```sh
npx fuzzy-toolkit map-fields export.csv --to firstName,lastName,email,postalCode > clean.csv
# Prénom -> firstName
# E-mail -> email
# Zip -> postalCode
# not found, left empty: lastName
```

What was renamed goes to the terminal, the file to standard output. Columns that match none of your names are kept at the end (`--drop` leaves them out), and `--to` also takes a `.json` file: an array of names or a JSON Schema.

## Search and compare

```sh
npx fuzzy-toolkit search "bohemian rapsody" songs.csv -k title -k artist -l 5
npx fuzzy-toolkit compare "beyonsay" "Beyoncé" --phonetic
```

## Options

| Option | Effect |
| --- | --- |
| `-k, --key <column>` | Column holding the text. Repeatable. |
| `--left-key`, `--right-key` | `join`: columns of each file. |
| `--unique` | `join`: use each right row at most once. |
| `-t, --threshold <0-100>` | Minimum score (default 80). |
| `-p, --preset <name>` | `music`, `search` or `strict`. |
| `--phonetic` | Also match texts that sound the same. |
| `-i, --ignore <word>` | Word to ignore. Repeatable. |
| `-l, --limit <n>` | `search`: maximum number of results (default 10). |
| `--json` | Write JSON. |
