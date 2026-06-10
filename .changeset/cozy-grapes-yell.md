---
"@savvy-web/changesets": major
---

## Breaking Changes

### Package Deprecation

The changelog formatter, changeset sections, and remark-based validation pipeline have moved into the Silk Suite monorepo and now ship via `@savvy-web/silk` (including the dual-format `./changesets/markdownlint` entry for markdownlint-cli2), driven by the unified `savvy` CLI.

  Migration:
  - Replace `@savvy-web/changesets` with `@savvy-web/silk`.
  - Point your changeset config at the `@savvy-web/silk/changesets/changelog` shim.
  - Replace the `savvy-changesets` bin with `savvy changeset`.

  This is the final release. No further fixes or security patches will be published.