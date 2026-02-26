# @savvy-web/changesets

[![npm version][npm-badge]][npm-url]
[![License: MIT][license-badge]][license-url]
[![Node.js >= 24][node-badge]][node-url]

Custom changelog formatter and markdown processing pipeline for the Silk Suite. Replaces the default `@changesets/cli/changelog` formatter with a three-layer architecture that validates changeset files, formats structured changelog entries, and post-processes the generated CHANGELOG.md.

## Features

- **Section-aware changesets** -- Categorize changes with h2 headings (Features, Bug Fixes, Breaking Changes, etc.)
- **Three-layer pipeline** -- Pre-validation (remark-lint), changelog formatting (Changesets API), and post-processing (remark-transform)
- **CLI tooling** -- `savvy-changesets` binary with init, lint, check, transform, and version subcommands
- **GitHub integration** -- Automatic PR links, commit references, and contributor attribution
- **Version file syncing** -- Bump version fields in additional JSON files using glob patterns and JSONPath expressions
- **Editor support** -- markdownlint rules for real-time validation in VS Code and CI

## Installation

```bash
pnpm add @savvy-web/changesets
```

## Quick Start

Bootstrap your repository:

```bash
savvy-changesets init
```

This creates `.changeset/config.json` with auto-detected GitHub repo settings and configures markdownlint rules. Or configure manually:

```json
{
  "changelog": [
    "@savvy-web/changesets/changelog",
    { "repo": "owner/repo" }
  ]
}
```

Write section-aware changeset files:

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

## Documentation

- [Section-Aware Pipeline](./docs/section-aware-pipeline.md) -- End-to-end walkthrough of how section-aware changesets flow through the pipeline
- [Configuration](./docs/configuration.md) -- Options, version files, markdownlint integration, CI scripts
- [CLI Reference](./docs/cli.md) -- All commands and options
- [API Reference](./docs/api.md) -- Classes, types, Effect services, remark plugins
- [Architecture](./docs/architecture.md) -- Three-layer pipeline design and export map

## License

MIT

[npm-badge]: https://img.shields.io/npm/v/@savvy-web/changesets
[npm-url]: https://www.npmjs.com/package/@savvy-web/changesets
[license-badge]: https://img.shields.io/badge/License-MIT-yellow.svg
[license-url]: https://opensource.org/licenses/MIT
[node-badge]: https://img.shields.io/badge/node-%3E%3D24-brightgreen
[node-url]: https://nodejs.org/
