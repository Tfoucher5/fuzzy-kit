# Releasing

Maintainers only. Releases go out from `master`.

1. Make sure CI is green on `master`.
2. Pick the version (see "Versioning" in CONTRIBUTING.md) and set it:
   `npm version <major|minor|patch> --no-git-tag-version`.
3. In `docs/guide/changelog.md`, rename **Unreleased** to the version and
   add a fresh empty **Unreleased** section above it.
4. Open a pull request "Release vX.Y.Z", merge it once CI passes.
5. On GitHub, create a release with the tag `vX.Y.Z` on `master`, and paste
   the changelog entry as notes. Publishing the release runs
   `.github/workflows/publish.yml`: it checks that the tag matches
   `package.json`, runs every check, and publishes to npm with provenance.

## One-time setup

- **npm trusted publishing**: on npmjs.com, package `fuzzy-toolkit` >
  Settings > Trusted publishing > GitHub Actions: owner `Tfoucher5`,
  repository `fuzzy-toolkit`, workflow `publish.yml`, environment `npm`,
  and tick **Allow npm publish** (without it the publish step fails with
  `403 OIDC permission denied for this action`). No npm token is stored
  anywhere.
- **GitHub environment `npm`**: Settings > Environments > New environment
  `npm`, with yourself as required reviewer, so a release waits for your
  click before publishing.

## Manual publish (fallback)

```sh
git checkout master && git pull
npm ci
npm publish   # runs the build and the tests first
```
