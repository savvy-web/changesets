# @savvy-web/changesets

[![npm version][npm-badge]][npm-url]
[![License: MIT][license-badge]][license-url]
[![Node.js >= 24][node-badge]][node-url]

Custom changelog formatter and markdown processing pipeline for the Silk Suite. Replaces the default `@changesets/cli/changelog` formatter with a three-layer architecture: pre-validation (remark-lint), changelog formatting (Changesets API), and post-processing (remark-transform).

## Features

- **Section-aware changesets** -- Categorize changes with h2/h3 headings (Features, Bug Fixes, Breaking Changes, etc.)
- **CLI tooling** -- `savvy-changesets` binary with init, lint, check, validate-file, transform, and version subcommands
- **GitHub integration** -- Automatic PR links, commit references, and contributor attribution
- **Editor support** -- markdownlint rules for real-time validation in VS Code and CI
- **Claude Code plugin** -- Automated validation hooks, skills, and a changeset-writer agent for AI-assisted development

## Repository Structure

This is a pnpm workspace monorepo:

| Directory | Purpose |
| --------- | ------- |
| `package/` | The published `@savvy-web/changesets` npm package |
| `plugin/` | Companion Claude Code plugin (hooks, skills, agents) |
| `docs/` | Repository-level documentation |
| `lib/` | Shared workspace configuration (lint-staged, markdownlint) |

## Development

```bash
pnpm install
pnpm run build          # Build all (dev + prod)
pnpm run test           # Run all tests
pnpm run lint           # Check code with Biome
pnpm run typecheck      # Type-check via Turbo (tsgo)
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for full development setup and conventions.

## Documentation

- [Package README](./package/README.md) -- Installation, quick start, and API overview
- [CLI Reference](./docs/cli.md) -- All commands and options
- [Section-Aware Pipeline](./docs/section-aware-pipeline.md) -- End-to-end walkthrough
- [Configuration](./docs/configuration.md) -- Options, version files, CI integration
- [Architecture](./docs/architecture.md) -- Three-layer pipeline design
- [API Reference](./docs/api.md) -- Classes, types, Effect services, remark plugins
- [Markdownlint Rules](./docs/rules/) -- Per-rule documentation

## License

[MIT](./LICENSE)

[npm-badge]: https://img.shields.io/npm/v/@savvy-web/changesets
[npm-url]: https://www.npmjs.com/package/@savvy-web/changesets
[license-badge]: https://img.shields.io/badge/License-MIT-yellow.svg
[license-url]: https://opensource.org/licenses/MIT
[node-badge]: https://img.shields.io/badge/node-%3E%3D24-brightgreen
[node-url]: https://nodejs.org/
