# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

`@savvy-web/changesets` is a custom changelog formatter and markdown processing
pipeline for the Silk Suite. It replaces the default `@changesets/cli/changelog`
formatter with a three-layer architecture: remark-lint pre-validation, changelog
formatter (Changesets API), and remark-transform post-processing. Includes an
Effect CLI and markdownlint rules for editor/CI integration.

## Commands

### Development

```bash
pnpm run lint              # Check code with Biome
pnpm run lint:fix          # Auto-fix lint issues
pnpm run typecheck         # Type-check via Turbo (tsgo)
pnpm run test              # Run all tests
pnpm run test:watch        # Run tests in watch mode
pnpm run test:coverage     # Run tests with coverage report
```

### Building

```bash
pnpm run build             # Build all (dev + prod)
pnpm run build:dev         # Development build only
pnpm run build:prod        # Production/npm build only
```

### Running a Single Test

```bash
pnpm vitest run src/changelog/index.test.ts
```

### CLI

```bash
npx tsx src/bin/cli.ts lint [dir]        # Machine-readable changeset validation
npx tsx src/bin/cli.ts check [dir]       # Human-readable validation summary
npx tsx src/bin/cli.ts transform [file]  # CHANGELOG.md post-processing
npx tsx src/bin/cli.ts version [dir]     # Monorepo changelog orchestration
```

## Architecture

### Three-Layer Pipeline

1. **Pre-validation** (remark-lint): Validate changeset markdown structure
2. **Changelog formatter** (Changesets API): Generate structured CHANGELOG
3. **Post-transform** (remark): Clean up and normalize output

### Export Map

Four entry points via subpath exports:

- `.` -- Main public API (`src/index.ts`)
- `./changelog` -- Changesets formatter integration (`src/changelog/index.ts`)
- `./markdownlint` -- Custom markdownlint rules (`src/markdownlint/index.ts`)
- `./remark` -- Remark lint and transform plugins (`src/remark/index.ts`)

### Build System

Uses `@savvy-web/rslib-builder` (`NodeLibraryBuilder`) with dual output:

1. `dist/dev/` -- Development build with source maps
2. `dist/npm/` -- Production build for npm publishing

**IMPORTANT -- Export path transformation:** The source `package.json` has
`exports` pointing to TypeScript source files (e.g., `"./": "./src/index.ts"`).
This is intentional. `NodeLibraryBuilder` automatically transforms these during
build into proper production exports with `types` and `import` subfields
pointing to compiled `.js` and `.d.ts` files. The builder also flips
`"private": true` to `"private": false` and resolves `catalog:` protocol
references in the output `dist/npm/package.json`. Do NOT manually modify export
paths or the `private` field in the source `package.json`.

Turbo orchestrates tasks: `typecheck` depends on `build` completing first.

### Dual API Surface

- **Effect primitives**: Core logic uses Effect-TS (Schema, services, layers)
- **Class-based static wrappers**: Simplified API for non-Effect consumers

### Key Patterns

- Effect Schema for validation at system boundaries (not internal shapes)
- `Schema.TaggedError` for typed error channels
- `unified().use(plugin).processSync()` for testing remark/unified plugins
- `Command.make(name, { opts }, handler)` for @effect/cli commands
- Biome enforces `interface` over `type` (except literal unions)
- Use `.js` extensions for relative imports (ESM)
- Use `node:` protocol for Node.js built-ins
- Separate type imports: `import type { Foo } from './bar.js'`

### Code Quality

- **Biome**: Unified linting and formatting
- **Commitlint**: Conventional commits with DCO signoff
- **Husky**: pre-commit (lint-staged), commit-msg, pre-push (tests)

### Testing

- **Framework**: Vitest with v8 coverage
- **Pool**: Uses forks (not threads) for Effect-TS compatibility
- **Coverage thresholds**: 85% lines/branches/statements, 80% functions

## Design Documentation

**For full architecture, rationale, and implementation details:**
-> `@./.claude/design/changesets/architecture.md`

Load when working on architectural changes, understanding the three-layer
pipeline, section categories, contributor tracking, or integration points.
**Do NOT load unless directly relevant to your task.**

## Conventions

### Commits

All commits require:

1. Conventional commit format (feat, fix, chore, etc.)
2. DCO signoff: `Signed-off-by: Name <email>`

### Publishing

Packages publish to both GitHub Packages and npm with provenance.
