---
title: Extensions
description: Language packs and presets for fuzzy-toolkit, built in and from the community.
---

# Extensions

Language packs teach fuzzy-toolkit how a language writes numbers, its
articles, stop words and how it sounds. Presets are ready-made settings for
one kind of data: song titles, addresses, company names... See
[Languages and presets](/guide/extensions) to use or write one.

<Extensions />

## Add yours

1. Start the package in one command. It writes `package.json`, the pack and its test:

   ```sh
   npx fuzzy-toolkit new-pack language pt      # or: new-pack preset company-names
   ```

   Fill in the pack with `defineLanguage()` or `definePreset()`, and add cases to the test, which uses
   [`fuzzy-toolkit/testing`](/guide/extensions#testing-your-pack). The [Wanted](#wanted) list above shows what people asked for.
2. Publish it on npm as `fuzzy-toolkit-lang-<code>` or
   `fuzzy-toolkit-preset-<name>`, with the keyword `fuzzy-toolkit-plugin`
   ([details](/guide/extensions#publishing)). It shows up here on the next
   rebuild of the site, at least once a week.
3. Optional: to get the **Reviewed** badge, open a pull request that adds it to
   [`docs/extensions.json`](https://github.com/Tfoucher5/fuzzy-toolkit/blob/master/docs/extensions.json):

```json
{
  "package": "fuzzy-toolkit-lang-pt",
  "kind": "language",
  "id": "pt",
  "description": "Portuguese: vinte e um, ordinals, articles, stop words, sounds-alike rules.",
  "repository": "https://github.com/you/fuzzy-toolkit-lang-pt"
}
```

A maintainer checks that the package does what it says and that its tests use
`fuzzy-toolkit/testing`. A pack good enough for everyone can also be
proposed for the core: open a "Language request" or "Preset proposal" issue.
