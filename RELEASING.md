# Releasing

Releases go out from `master`, automatically, once a version bump is merged.

1. Pick the version (see "Versioning" in CONTRIBUTING.md) and set it:
   `npm version <major|minor|patch> --no-git-tag-version`.
2. In `docs/guide/changelog.md`, rename **Unreleased** to the version and
   add a fresh empty **Unreleased** section above it.
3. Open a pull request "Release vX.Y.Z" and merge it once CI passes.

The merge runs `.github/workflows/publish.yml`. It creates the tag `vX.Y.Z`
and the GitHub release (notes from the `## vX.Y.Z` changelog section), runs
every check, publishes to npm with provenance once a maintainer approves the
`npm` environment, then attaches the npm tarball and its signed provenance to
the release.

npm publishing uses trusted publishing (OIDC): no token is stored anywhere.
It is tied to the workflow file name `publish.yml` and the environment `npm`,
so keep both names.
