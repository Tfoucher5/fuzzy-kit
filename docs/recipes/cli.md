# Command line

Dedupe a customer export, match two spreadsheets, or try a score, without writing code. Works with `npx`, nothing to install.

```sh
npx guess-rater --help
```

## Input and output

- **CSV**, with commas, semicolons (Excel in French) or tabs, detected from the first line. The first line holds column names.
- **JSON**: an array of strings or of objects.
- **Plain text**: one item per line.
- `-` reads standard input.

Results are written to standard output in the same format, so you can redirect them: `> clean.csv`. Add `--json` for JSON.

## Remove duplicates

```sh
npx guess-rater dedupe customers.csv -k name -i sarl -i sas > clean.csv
```

`-k` names the column to compare (the first one by default; repeat it to use several). `-i` ignores a word, such as a legal form. The first row of each group of near-duplicates is kept.

To review before deleting, `group` adds a `group` column instead: rows with the same number are duplicates of each other.

```sh
npx guess-rater group customers.csv -k name
```

## Match two files

```sh
npx guess-rater join orders.csv customers.csv --left-key client --right-key name --unique
```

Each row of `orders.csv` gets the columns of its best match in `customers.csv`, plus a `score` column. Rows with no match keep empty columns. `--unique` uses each customer at most once. Right columns with the same name as a left column are prefixed with `right_`.

## Search and compare

```sh
npx guess-rater search "bohemian rapsody" songs.csv -k title -k artist -l 5
npx guess-rater compare "beyonsay" "Beyoncé" --phonetic
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
