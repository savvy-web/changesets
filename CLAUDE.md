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
pnpm run lint:md           # Check markdown with markdownlint
pnpm run lint:md:fix       # Auto-fix markdown lint issues
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
# Bootstrap & validation
npx tsx src/bin/cli.ts init                    # Bootstrap a repo for @savvy-web/changesets
npx tsx src/bin/cli.ts lint [dir]              # Machine-readable changeset validation
npx tsx src/bin/cli.ts check [dir]             # Human-readable validation summary
npx tsx src/bin/cli.ts validate-file <file>    # Validate one changeset file

# CHANGELOG pipeline
npx tsx src/bin/cli.ts transform [file]        # CHANGELOG.md post-processing
npx tsx src/bin/cli.ts version                 # Monorepo changelog orchestration

# Configuration inspection
npx tsx src/bin/cli.ts config show [dir]       # Resolved .changeset/config.json (JSON / human)
npx tsx src/bin/cli.ts config validate [dir]   # Validate-only mode (exit code is the signal)

# Release-surface classification
npx tsx src/bin/cli.ts classify <paths...>     # Map paths to owning packages
npx tsx src/bin/cli.ts analyze-branch          # Diff + classify every changed file in one call
npx tsx src/bin/cli.ts release-surface <pkg>   # List everything owned by a package

# Dependency changesets
npx tsx src/bin/cli.ts deps detect             # Per-package dep diff (JSON or CSH005 markdown)
npx tsx src/bin/cli.ts deps regen              # Delete + recreate pure-dep changesets
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

### Key Dependencies

- `@savvy-web/silk-effects` -- `ChangesetConfigReader` Effect service for
  reading `.changeset/config.json`
- `workspaces-effect` -- `WorkspaceDiscovery`, `PackageManagerDetector`, and
  `WorkspaceRoot` Effect services for workspace discovery, package manager
  detection, and monorepo root finding
- `jsonc-effect` -- Effect-returning JSONC parse/modify/applyEdits APIs (used
  in init command for surgical JSONC edits that preserve comments)

### Key Patterns

- Effect Schema for validation at system boundaries (not internal shapes)
- `Schema.TaggedError` for typed error channels
- `unified().use(plugin).processSync()` for testing remark/unified plugins
- `Command.make(name, { opts }, handler)` for @effect/cli commands
- `ChangesetConfigReader` service (from `@savvy-web/silk-effects/versioning`)
  for config I/O; provide `ChangesetConfigReaderLive` layer at command edges
- `ConfigInspector` service (in `src/services/config-inspector.ts`) — reads
  the config, validates it against the schema, normalizes legacy
  `versionFiles[]` into the new `packages` shape with a deprecation
  warning, resolves package names against `WorkspaceDiscovery`, and runs
  the cross-package overlap / shadowing / conflict checks. Consumed by
  every 0.9.0 CLI command that needs the config.
- `BranchAnalyzer` service (`src/services/branch-analyzer.ts`) — wraps
  `ConfigInspector` plus `git diff` against the merge-base (covering
  committed + staged + unstaged) and `git ls-files --others` (untracked)
  to return per-file classification in one call. Used by `analyze-branch`
  and the agent's create-mode flow.
- `WorkspaceSnapshotReader` service (`src/services/workspace-snapshot.ts`)
  — reads workspace packages at arbitrary git refs via `git show <ref>:...`
  for the `deps detect` / `deps regen` diff. Caches per `(cwd, ref)`.
- `SilkPublishabilityDetectorLive` layer (`src/services/silk-publishability.ts`)
  — overrides `workspaces-effect`'s `PublishabilityDetector` with the
  silk-suite rules (private + `publishConfig.access` = publishable,
  `publishConfig.targets` array support, shorthand inheritance). Filters
  non-publishable workspaces out of the `deps detect` / `deps regen`
  defaults. Eventual home: `@savvy-web/silk-effects`.
- `WorkspaceDiscovery`, `PackageManagerDetector`, `WorkspaceRoot` services
  (from `workspaces-effect`) for workspace operations; provide `WorkspacesLive`
  layer at CLI entry point
- `VersionFiles.processResolvedVersionFiles(scopes, dryRun)` — 0.9.0 path
  for version-file updates; consumes `ResolvedPackageScope[]` from
  `ConfigInspector.inspect`. The legacy `VersionFiles.processVersionFiles`
  (legacy top-level `versionFiles[]`) still exists for the `init`
  command's check path; both go away in 1.0.0.
- `jsonc-effect` `modify` + `applyEdits` for JSONC mutations (not
  `JSON.stringify`)
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
--> `@./.claude/design/changesets/architecture.md`

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
