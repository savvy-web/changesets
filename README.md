# @savvy-web/changesets

[![npm version][npm-badge]][npm-url]
[![License: MIT][license-badge]][license-url]

Custom changelog formatter and markdown processing pipeline for the Silk Suite. Replaces the default `@changesets/cli/changelog` formatter with a three-layer architecture that validates changeset files, formats structured changelog entries, and post-processes the generated CHANGELOG.md.

## Features

- **Section-aware changesets** -- Use h2 headings in changeset files to categorize changes (Features, Bug Fixes, Breaking Changes, etc.)
- **Three-layer pipeline** -- Pre-validation (remark-lint), changelog formatting (Changesets API), and post-processing (remark-transform)
- **13 section categories** -- Consistent categorization with priority-based ordering across all layers
- **CLI tooling** -- `savvy-changesets` binary with init, lint, transform, check, and version subcommands for CI and local use
- **GitHub integration** -- Automatic PR links, commit references, and contributor attribution
- **Remark plugins** -- Lint rules and transform plugins via `@savvy-web/changesets/remark`
- **markdownlint rules** -- Custom rules compatible with [markdownlint-cli2](https://www.npmjs.com/package/markdownlint-cli2) and the VS Code extension via `@savvy-web/changesets/markdownlint`

## Installation

```bash
pnpm add @savvy-web/changesets
```

## Quick Start

Bootstrap your repository:

```bash
savvy-changesets init
```

This creates `.changeset/config.json` with auto-detected GitHub repo settings. Or configure manually:

```json
{
  "changelog": [
    "@savvy-web/changesets/changelog",
    { "repo": "owner/repo" }
  ]
}
```

Write [section-aware changeset files](docs/section-aware-pipeline.md):

```markdown
---
"@my/package": minor
---

## Features

Added a new authentication system with OAuth2 support.

## Tests

- Added unit tests for OAuth2 flow
- Updated integration test fixtures
```

## markdownlint Integration

Register the custom rules in your base config (e.g., `lib/configs/.markdownlint-cli2.jsonc`):

```jsonc
{
  "customRules": [
    "@savvy-web/changesets/markdownlint"
  ],
  "config": {
    "changeset-heading-hierarchy": false,
    "changeset-required-sections": false,
    "changeset-content-structure": false
  }
}
```

Then enable the rules only for changeset files by creating `.changeset/.markdownlint.json`:

```json
{
  "extends": "../lib/configs/.markdownlint-cli2.jsonc",
  "default": false,
  "changeset-heading-hierarchy": true,
  "changeset-required-sections": true,
  "changeset-content-structure": true,
  "MD041": false
}
```

## Documentation

- [Section-Aware Pipeline](./docs/section-aware-pipeline.md) -- End-to-end walkthrough of how section-aware changesets flow through the three-layer pipeline
- [Full documentation](./docs/) -- CLI usage, API reference, configuration, and architecture

## License

MIT

[npm-badge]: https://img.shields.io/npm/v/@savvy-web/changesets
[npm-url]: https://www.npmjs.com/package/@savvy-web/changesets
[license-badge]: https://img.shields.io/badge/License-MIT-yellow.svg
[license-url]: https://opensource.org/licenses/MIT
