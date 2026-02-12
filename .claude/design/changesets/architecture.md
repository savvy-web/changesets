---
status: draft
module: changesets
category: architecture
created: 2026-02-11
updated: 2026-02-11
last-synced: 2026-02-11
completeness: 15
related: []
dependencies: []
implementation-status: not-started
---

# @savvy-web/changesets - Architecture

A custom changelog formatter and markdown processing pipeline for the Silk Suite that replaces
the default `@changesets/cli/changelog` formatter. Provides pre-validation of changeset files,
a structured changelog formatter for the Changesets API, and post-processing transformation of
generated CHANGELOG.md files.

## Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Prior Art](#prior-art)
4. [Rationale](#rationale)
5. [System Architecture](#system-architecture)
6. [Changesets API Integration](#changesets-api-integration)
7. [Three-Layer Processing Architecture](#three-layer-processing-architecture)
8. [Section Categories](#section-categories)
9. [Contributor Tracking](#contributor-tracking)
10. [Issue and Ticket Linking](#issue-and-ticket-linking)
11. [Changeset File Format](#changeset-file-format)
12. [Export Map and CLI](#export-map-and-cli)
13. [Dependencies](#dependencies)
14. [Integration Points](#integration-points)
15. [Compatibility Requirements](#compatibility-requirements)
16. [Testing Strategy](#testing-strategy)
17. [Future Enhancements](#future-enhancements)
18. [Related Documentation](#related-documentation)

---

## Overview

The `@savvy-web/changesets` package is part of the Silk Suite -- a standardized build/deploy
system for a web agency. It replaces the default `@changesets/cli/changelog` formatter across
all Silk Suite repositories with a structured, section-aware changelog generation system.

**Key Design Principles:**

- **Structured changesets**: Changeset files use section headings (Features, Bug Fixes, etc.)
  to categorize changes, enabling rich, organized CHANGELOG output
- **Three-layer pipeline**: Pre-validation (lint), formatting (Changesets API), and
  post-transformation (remark) work together for end-to-end quality
- **Unified ecosystem**: Built on remark/unified for all markdown processing, providing a
  consistent, composable plugin architecture
- **AI-agent friendly**: Pre-validation rules ensure Claude and other AI agents write valid
  changesets in real-time during development
- **Backward compatible**: Generated CHANGELOG.md maintains compatibility with
  workflow-release-action, GitHub rendering, and Biome formatting

**When to reference this document:**

- When implementing any of the three processing layers
- When adding new section categories or modifying priority ordering
- When integrating with the Changesets API or remark pipeline
- When modifying the CLI commands or export map
- When ensuring compatibility with workflow-release-action

---

## Current State

### Repository Status

This repository was freshly cloned from the `pnpm-module-template`. The build infrastructure
is fully configured but no implementation exists yet.

**What exists:**

- pnpm monorepo structure (single-package, root IS the package)
- Rslib build pipeline with dual output (`dist/dev/`, `dist/npm/`)
- Turbo build orchestration with task dependencies
- Vitest test framework with v8 coverage
- Biome linting and formatting (extends `@savvy-web/lint-staged/biome/silk.jsonc`)
- Husky hooks with lint-staged pre-commit
- Commitlint with conventional commits and DCO signoff
- `.changeset/config.json` using default `@changesets/cli/changelog` (this is what we replace)
- Dual publishing to GitHub Packages and npmjs.org

**What needs to change:**

- Package name: `@savvy-web/pnpm-module-template` must become `@savvy-web/changesets`
- Package description, homepage, repository URLs need updating
- Source code: placeholder `src/index.ts` must be replaced with implementation
- Dependencies: remark/unified ecosystem, Effect CLI, @changesets/types must be added
- Export map: multiple entry points needed (`.`, `./changelog`, `./remark-lint`,
  `./remark-transform`)
- CLI binary: `savvy-changeset` must be configured
- `.changeset/config.json`: must point to `@savvy-web/changesets/changelog` once implemented

### Source Files (Planned)

```text
src/
├── index.ts                    # Main export: Effect primitives + class-based API
├── errors.ts                   # Tagged errors (ChangesetValidationError, etc.)
│
├── services/                   # Effect services (core composable units)
│   ├── changelog.ts            # ChangelogService + ChangelogLive layer
│   ├── github.ts               # GitHubService + GitHubLive / GitHubTest layers
│   ├── markdown.ts             # MarkdownService + MarkdownLive layer
│   └── validation.ts           # ValidationService + ValidationLive layer
│
├── schemas/                    # Effect Schemas (shared across all layers)
│   ├── options.ts              # ChangesetOptionsSchema, changelog config
│   ├── git.ts                  # CommitHashSchema, conventional commit patterns
│   ├── github.ts               # GitHubInfoSchema, PR/user response schemas
│   ├── categories.ts           # SectionCategorySchema, category definitions
│   └── changeset.ts            # Changeset file schema, frontmatter
│
├── api/                        # Class-based API (bridges Effect to plain async)
│   ├── changelog.ts            # Changelog.formatReleaseLine(), etc.
│   ├── linter.ts               # ChangesetLinter.validate(), etc.
│   ├── transformer.ts          # ChangelogTransformer.transform(), etc.
│   └── categories.ts           # Categories.resolve(), Categories.ordered(), etc.
│
├── changelog/                  # Layer 2: Changesets API formatter
│   ├── index.ts                # Entry point (exports ChangelogFunctions default)
│   ├── getReleaseLine.ts       # Per-changeset line formatter
│   └── getDependencyReleaseLine.ts  # Dependency update formatter
│
├── remark-lint/                # Layer 1: Pre-validation rules
│   ├── index.ts                # Lint rules entry point
│   ├── heading-hierarchy.ts    # Must start with h2, no h1, no skips
│   ├── required-sections.ts    # Validate required section structure
│   └── content-structure.ts    # Content validation rules
│
├── remark-transform/           # Layer 3: Post-processing
│   ├── index.ts                # Transform pipeline entry point
│   ├── merge-sections.ts       # Merge duplicate section headings
│   ├── reorder-sections.ts     # Reorder by priority (Breaking first)
│   ├── deduplicate-items.ts    # Remove duplicate list items
│   ├── contributor-footnotes.ts # Aggregate + deduplicate contributor footnotes
│   ├── issue-link-refs.ts      # Collect + deduplicate reference-style links
│   └── normalize-format.ts     # Normalize markdown formatting
│
├── cli/                        # Effect CLI (savvy-changeset)
│   ├── index.ts                # Root command
│   └── commands/
│       ├── create.ts           # Interactive guided changeset creation
│       ├── lint.ts             # Validate changeset files
│       ├── transform.ts        # Post-process CHANGELOG.md
│       └── check.ts            # Full validation pipeline
│
├── vendor/                     # Vendored upstream code (see Decision 7)
│   ├── types.ts                # From @changesets/types, redefined as Effect Schemas
│   ├── github-info.ts          # From @changesets/get-github-info, wrapped in Effect
│   ├── parse.ts                # From @changesets/parse, YAML frontmatter parsing
│   └── ci-logger.ts            # From @actions/core, Effect Logger CI layer
│
└── utils/
    ├── remark-pipeline.ts      # Shared unified processor (parse + gfm + stringify)
    ├── section-parser.ts       # Parse sections from changeset content
    ├── commit-parser.ts        # Conventional commit type(scope): desc parsing
    └── issue-refs.ts           # closes/fixes/refs/resolves pattern extraction
```

---

## Prior Art

### Existing Implementation: @savvy-web/changelog

A working changelog formatter already exists at `/Users/spencer/workspaces/savvy-web/workflow/pkgs/changelog/`.
This implementation was built for the `workflow` monorepo and provides the foundation that
`@savvy-web/changesets` will port, improve upon, and extend with the new remark-based layers.

**Source location:** `workflow/pkgs/changelog/`

**Package name:** `@savvy-web/changelog`

#### Source Structure

```text
workflow/pkgs/changelog/
├── src/
│   ├── index.ts                # Adapter layer: bridges strict types to Changesets API
│   └── utils/
│       ├── constants.ts        # MARKDOWN_LINK_PATTERN regex
│       ├── format.ts           # Commit parsing, categorization, entry formatting
│       ├── helper.ts           # getReleaseLine, getDependencyReleaseLine, getFormattedReleaseLines
│       └── validation.ts       # Valibot schemas for all data validation
├── __test__/
│   ├── changelog.test.ts       # 50+ tests covering all formatter functions
│   └── validation.test.ts      # Schema validation tests
├── types/
│   └── env.d.ts                # Environment type declarations
└── package.json
```

#### Key Features Implemented

##### 1. Adapter Pattern for Type Safety

The `index.ts` exports adapted versions of the internal functions that bridge the gap between
strict internal types (`{ repo: string } | null`) and the flexible Changesets API types
(`null | Record<string, any>`). The adapted functions cast the options parameter to ensure
type safety while maintaining Changesets compatibility:

```typescript
const adaptedGetReleaseLine: GetReleaseLine = (changeset, versionType, options) =>
  getReleaseLine(changeset, versionType, options as { repo: string } | null);
```

##### 2. Valibot Schema Validation

Comprehensive runtime validation using valibot for all external data:

| Schema | Purpose |
| :--- | :--- |
| `RepoSchema` | Validates `owner/repository` format via regex |
| `CommitHashSchema` | Validates hex commit hashes (7+ chars) |
| `IssueNumberSchema` | Validates positive integer issue/PR numbers |
| `UsernameSchema` | Validates GitHub username format |
| `ChangesetSummarySchema` | Validates 1-1000 char summary length |
| `VersionTypeSchema` | Validates `major`, `minor`, `patch` picklist |
| `ChangesetOptionsSchema` | Validates `{ repo }` config object |
| `GitHubInfoSchema` | Validates GitHub API response (handles markdown links) |
| `ChangesetSchema` | Validates changeset object structure |
| `DependencyUpdateSchema` | Validates dependency update objects |

Two validation modes: `validate()` for strict validation with descriptive errors (includes
special ChangesetOptionsSchema handling with config guidance), and `safeValidate()` for
graceful null-returning validation (used for GitHub API responses that may not match schema).

##### 3. Conventional Commit Parsing

Full `type(scope): description` parsing with 11 recognized commit types:

```typescript
type CommitType =
  | "feat" | "fix" | "docs" | "style" | "refactor"
  | "perf" | "test" | "build" | "ci" | "chore" | "revert";
```

Multi-line commit messages are parsed with body extraction. Non-conventional messages
fall back to the raw description.

##### 4. Category Grouping via getFormattedReleaseLines

Groups changes under `###` headings in a defined order:

```typescript
const categoryOrder: string[] = [
  "Features", "Bug Fixes", "Performance", "Documentation",
  "Refactoring", "Tests", "Build System", "CI",
  "Maintenance", "Reverts", "Other",
];
```

Each changeset is categorized by parsing its summary's first line as a conventional commit.
The `typeToCategory` mapping converts commit types to user-friendly category names. Unknown
types map to "Other".

##### 5. Issue Reference Extraction

Parses `closes/fixes/refs` patterns from changeset body text:

```typescript
interface IssueReferences {
  closes: string[];  // "closes #123" or "close: #456, #789"
  fixes: string[];   // "fixes #123" or "fix: #456, #789"
  refs: string[];    // "refs #123" or "ref: #456, #789"
}
```

Supports case-insensitive matching, optional colons, optional `#` prefix, and
comma-separated lists.

##### 6. GitHub API Integration

Uses `@changesets/get-github-info` to fetch PR numbers, commit links, and usernames.
Handles both plain URLs and markdown-formatted links in API responses:

```typescript
// @changesets/get-github-info may return either format:
"https://github.com/owner/repo/pull/42"           // Plain URL
"[#42](https://github.com/owner/repo/pull/42)"    // Markdown link
```

The `extractUrlFromMarkdown()` helper normalizes both formats. The `formatPRAndUserAttribution()`
function handles all combinations of PR/user with/without links.

##### 7. Batched API Calls

Processes GitHub API calls in batches of 10 to avoid rate limiting:

```typescript
const BATCH_SIZE = 10;
for (let i = 0; i < changesets.length; i += BATCH_SIZE) {
  const batch = changesets.slice(i, i + BATCH_SIZE);
  const batchResults = await Promise.all(batch.map(/* ... */));
  commitLinks.push(...batchResults);
}
```

Tracks API failure counts and logs success rate metrics.

##### 8. Streaming Mode for Large Repositories

For repositories with >1000 changesets, automatically switches to streaming mode with
smaller chunk sizes (50) to prevent memory accumulation:

```typescript
const MAX_MEMORY_ITEMS = 1000;
const shouldUseStreamingMode = changesets.length > MAX_MEMORY_ITEMS;
```

In streaming mode, chunks are processed and grouped immediately, then chunk memory is cleared.

##### 9. Environment-Aware Logging

Uses `@actions/core.warning()` in GitHub Actions CI environments, falls back to
`console.warn` for local development:

```typescript
const logger = {
  warn: (message: string, ...args: unknown[]): void => {
    if (process.env.GITHUB_ACTIONS === "true") {
      core.warning(`${message} ${args.join(" ")}`);
    } else {
      console.warn(message, ...args);
    }
  },
};
```

##### 10. Graceful Degradation

All GitHub API failures are caught with fallback formatting. When `getInfo()` fails, the
formatter falls back to constructing commit links manually from the hash:

```typescript
return `[\`${cs.commit.substring(0, 7)}\`](https://github.com/${repo}/commit/${cs.commit})`;
```

#### Dependencies

```json
{
  "dependencies": {
    "@actions/core": "^1.11.1",
    "@changesets/get-github-info": "^0.6.0",
    "@changesets/git": "^3.0.4",
    "@changesets/parse": "^0.4.1",
    "@changesets/read": "^0.6.5",
    "valibot": "^1.1.0"
  },
  "devDependencies": {
    "@changesets/types": "^6.1.0"
  }
}
```

#### Test Coverage

The prior art has comprehensive test coverage with 50+ tests:

- **categorizeChangeset**: All 11 commit types + unknown type fallback
- **parseIssueReferences**: closes/fixes/refs patterns, mixed formats, case insensitivity
- **formatChangelogEntry**: With/without commits, with/without issue refs
- **parseCommitMessage**: Conventional with/without scope, with body, non-conventional
- **getReleaseLine**: With GitHub info, without commits, null options, invalid repo
- **getDependencyReleaseLine**: With deps, empty deps, API failures, null options
- **getFormattedReleaseLines**: Category grouping, API failures, no commits, streaming mode
- **formatPRAndUserAttribution**: All combinations of PR/user with/without links
- **Validation schemas**: All schemas with valid/invalid inputs, edge cases
- **Streaming mode**: >1000 changesets, mixed commit/no-commit, API failures with metrics

### What We Carry Forward

These proven patterns and implementations will be ported to `@savvy-web/changesets`:

| Pattern | Prior Art | New Package | Changes |
| :--- | :--- | :--- | :--- |
| Adapter pattern | `index.ts` type adapters | Keep | Same approach for Changesets API bridging |
| Runtime validation | Valibot schemas | Port to Effect Schema | Migrate from valibot to Effect Schema for consistency with Effect CLI |
| Conventional commit parsing | `parseCommitMessage()` | Keep | Port directly, same regex patterns |
| Category grouping | `getFormattedReleaseLines()` | Refactor | Move into Layer 2 formatter; categories become shared data model |
| Issue reference extraction | `parseIssueReferences()` | Keep | Port directly, same patterns |
| GitHub API integration | `@changesets/get-github-info` | Keep | Same library, same batching strategy |
| Batched API calls | BATCH_SIZE = 10 | Keep | Same chunking approach |
| Streaming mode | MAX_MEMORY_ITEMS = 1000 | Keep | Same threshold and chunk strategy |
| Environment-aware logging | `@actions/core` detection | Evaluate | May use Effect Logger instead |
| Graceful degradation | try/catch with fallback | Keep | Same fallback formatting for API failures |
| Markdown link handling | `extractUrlFromMarkdown()` | Keep | Port directly |
| PR/user attribution | `formatPRAndUserAttribution()` | Keep | Port directly |

### What Is New in @savvy-web/changesets

These capabilities do NOT exist in the prior art and are entirely new:

| Capability | Description |
| :--- | :--- |
| **Layer 1: remark-lint rules** | Pre-validation of changeset file structure (heading hierarchy, section names, content quality) |
| **Layer 3: remark-transform** | Post-processing of CHANGELOG.md (section merging, reordering, deduplication, normalization) |
| **Structured changeset format** | Section headings (h2) in changeset files for multi-category changes |
| **Effect CLI** | `savvy-changeset` binary with create/lint/transform/check commands |
| **Remark/Unified ecosystem** | AST-based markdown processing replacing regex-based parsing where appropriate |
| **Category system as shared data model** | Single category definition used by all three layers |
| **Breaking Changes category** | Prior art lacks a dedicated breaking changes section |
| **Dependencies category** | Prior art handles deps via `getDependencyReleaseLine` but has no section heading for it |

### Migration Considerations

**Valibot to Effect Schema:**

The prior art uses valibot extensively for runtime validation. The new package should migrate
to `@effect/schema` (or `effect/Schema`) for consistency with the Effect CLI stack. Key
migration points:

- `RepoSchema` -> Effect Schema pipe with string + regex
- `CommitHashSchema` -> Effect Schema pipe with string + regex
- `ChangesetOptionsSchema` -> Effect Schema struct with branded types
- `GitHubInfoSchema` -> Effect Schema struct with optional fields
- `safeValidate()` -> `Schema.decodeUnknownOption()` or `Schema.decodeUnknownEither()`
- `validate()` -> `Schema.decodeUnknownSync()` with custom error formatting

**@actions/core dependency:**

The prior art bundles `@actions/core` for CI-aware logging. Consider whether this should
remain a direct dependency or be replaced by Effect's logging capabilities with a custom
CI-aware logger layer. The `@actions/core` package is lightweight but creates a coupling
to GitHub Actions specifically.

**getFormattedReleaseLines refactoring:**

The prior art's `getFormattedReleaseLines()` is an aggregate function that Changesets does
not call directly -- it was likely used for testing or custom tooling. In the new architecture,
the category grouping it performs should be split:

- Per-changeset categorization moves into `getReleaseLine` (Layer 2)
- Cross-changeset merging and ordering moves into Layer 3 (remark-transform)

---

## Rationale

### Architectural Decisions

#### Decision 1: Three-Layer Processing Architecture

**Context:** Changesets generates CHANGELOGs by calling `getReleaseLine` once per changeset,
then assembling the results under version headings and bump-type sections. There is no
aggregate-level hook for restructuring the final output.

**Options considered:**

1. **Three-layer pipeline: lint + format + transform (Chosen):**
   - Pros: Each layer has a clear, focused responsibility; pre-validation catches errors
     early; post-transformation compensates for API limitations; remark ecosystem provides
     all three layers
   - Cons: More complex system; requires CI script integration for transform step
   - Why chosen: The Changesets API only provides line-level formatting hooks. Without
     post-processing, duplicate sections from multiple changesets cannot be merged, and
     section ordering cannot be enforced. Pre-validation ensures inputs are well-structured.

2. **Format-only approach (custom getReleaseLine only):**
   - Pros: Simpler, single integration point
   - Cons: Cannot merge sections across changesets, cannot reorder sections, no input
     validation
   - Why rejected: The line-level API cannot produce the quality of output needed

3. **Fully custom changelog generation (bypass Changesets API):**
   - Pros: Complete control over output
   - Cons: Must reimplement version heading logic, bump-type grouping, and all the
     coordination Changesets does internally; fragile coupling to Changesets internals
   - Why rejected: Too much reimplementation; fighting the tool rather than extending it

#### Decision 2: Remark/Unified Ecosystem for All Markdown Processing

**Context:** Need to parse, validate, transform, and generate markdown across all three layers

**Options considered:**

1. **Remark/Unified for everything (Chosen):**
   - Pros: Single AST model (MDAST) across all layers; rich plugin ecosystem; composable
     pipeline architecture; ESM-only aligns with our setup; well-maintained
   - Cons: Learning curve for MDAST; some operations verbose at AST level
   - Why chosen: Consistency across layers eliminates impedance mismatches; the plugin
     architecture naturally maps to our three-layer design

2. **Regex-based parsing with custom generation:**
   - Pros: Simple, no dependencies
   - Cons: Fragile, hard to maintain, cannot handle nested markdown structures reliably
   - Why rejected: Markdown is too complex for regex; edge cases would multiply

3. **markdown-it or marked for parsing, custom for generation:**
   - Pros: Mature parsers, fast
   - Cons: No unified transform pipeline; lint rules would need separate tooling; two
     different AST models
   - Why rejected: Fragments the architecture across incompatible tools

#### Decision 3: Section-Based Changeset Structure

**Context:** Need a way to categorize changes within a single changeset file so the formatter
can produce organized output

**Options considered:**

1. **Markdown section headings in changeset content (Chosen):**
   - Pros: Natural markdown; readable in raw form; parseable by remark; validates with
     standard lint rules; works well with AI agents that write markdown
   - Cons: Requires pre-validation to ensure correct structure; more complex than flat text
   - Why chosen: Leverages the fact that changeset summaries are already markdown; section
     headings are a natural categorization mechanism

2. **Frontmatter metadata for categories:**
   - Pros: Structured, easy to parse
   - Cons: Duplicates information; changeset files already have YAML frontmatter for
     package/bump-type; adding more frontmatter is awkward
   - Why rejected: Overloads the frontmatter section; categories belong in the content

3. **Conventional commit prefixes in changeset summary (prior art approach):**
   - Pros: Familiar convention; short; proven in `@savvy-web/changelog` with 11 commit types
   - Cons: Only categorizes the entire changeset, not individual items; loses markdown
     richness; does not support multiple categories per changeset; requires parsing the
     first line as `type(scope): description` which is fragile
   - Why rejected: Too limiting; a single changeset should be able to document features,
     tests, and docs changes together. The prior art demonstrates the limitation: each
     changeset can only belong to one category, leading to either overly granular changesets
     or miscategorized multi-concern changes

#### Decision 4: Effect CLI Framework

**Context:** Need a CLI for changeset validation, transformation, and guided creation

**Options considered:**

1. **Effect CLI with @effect/cli + @effect/platform-node (Chosen):**
   - Pros: Already established in lint-staged; type-safe argument parsing; composable
     command structure; consistent Silk Suite pattern
   - Cons: Effect dependency; more verbose than simpler alternatives
   - Why chosen: Consistency with `@savvy-web/lint-staged` which uses the same stack;
     the static class + factory pattern for TSDoc discoverability is already proven

2. **Commander.js or yargs:**
   - Pros: Widely used, simple API
   - Cons: Different pattern from lint-staged; less type-safe; inconsistent with Silk Suite
   - Why rejected: Would introduce a different CLI pattern across the suite

3. **No CLI, scripts only:**
   - Pros: Zero dependencies
   - Cons: Poor UX for interactive creation; harder to compose in CI pipelines
   - Why rejected: Need interactive creation and composable commands

#### Decision 5: Static Class + Factory Pattern

**Context:** Need a consistent API pattern that works well with TSDoc

**Options considered:**

1. **Static class + factory pattern (Chosen):**
   - Pros: Proven in `@savvy-web/lint-staged`; excellent TSDoc documentation; groups related
     constants, types, and methods; discoverable API
   - Cons: Slightly more verbose than bare function exports
   - Why chosen: Consistency with the Silk Suite; TSDoc generates clear documentation

2. **Bare function exports:**
   - Pros: Simpler, tree-shakeable
   - Cons: Inconsistent with lint-staged; harder to discover related pieces
   - Why rejected: Breaks Silk Suite consistency

#### Decision 6: Effect Schema Over Valibot for Runtime Validation

**Context:** The prior art (`@savvy-web/changelog`) uses valibot for runtime validation of
options, GitHub API responses, changeset data, and commit hashes. The new package needs
runtime validation but also uses the Effect ecosystem for its CLI.

**Options considered:**

1. **Migrate to Effect Schema (Chosen):**
   - Pros: Single runtime for both CLI and validation; composable with Effect pipelines;
     branded types integrate with Effect's type system; no additional dependency
   - Cons: Migration effort; Effect Schema API differs from valibot; some patterns
     (like valibot's `v.pipe()` with `v.regex()`) need rethinking
   - Why chosen: The package already depends on Effect for CLI. Using Effect Schema
     eliminates valibot as a dependency and unifies the runtime validation story.

2. **Keep valibot (prior art approach):**
   - Pros: Zero migration effort; proven schemas; well-tested
   - Cons: Additional dependency alongside Effect; two validation paradigms in one package;
     inconsistent with the Effect-first approach
   - Why rejected: Redundant with Effect Schema; increases bundle size without benefit

3. **No runtime validation (trust types):**
   - Pros: Zero runtime overhead; simpler code
   - Cons: External data (GitHub API responses, user config) cannot be trusted at compile
     time; the prior art validates for good reason -- API responses vary
   - Why rejected: Runtime validation at system boundaries is essential; prior art proves this

**Migration plan:** Port each valibot schema to an Effect Schema equivalent. The prior art's
`safeValidate()` maps to `Schema.decodeUnknownOption()` and `validate()` maps to
`Schema.decodeUnknownSync()`.

#### Decision 7: Vendor/Fork Changesets Internals Rather Than Depend on Upstream

**Context:** The Changesets team has historically been reluctant to accept changes or expand
their APIs (e.g., no aggregate `getChangelogEntry` hook, limited type generics on
`ChangelogFunctions`). Our package depends on Changesets internals like
`@changesets/get-github-info`, `@changesets/types`, and potentially `@changesets/parse`,
`@changesets/read`, and `@changesets/git`. Being blocked by upstream decisions on these
lower-level packages would limit our ability to iterate.

**Options considered:**

1. **Vendor critical code, keep minimal upstream deps (Chosen):**
   - Pros: Full control over GitHub info fetching, type definitions, and parsing logic;
     can fix bugs and add features without waiting for upstream; can adapt types to our
     Effect-first architecture; reduces surface area for breaking changes from upstream
   - Cons: Maintenance burden for vendored code; must track upstream security fixes manually
   - Why chosen: The Changesets team's conservative approach to changes means we cannot
     rely on upstream for our needs. Vendoring gives us the control we need while keeping
     `@changesets/cli` as the only runtime peer dependency (which we must use since it
     orchestrates the version/publish lifecycle).

2. **Depend on all @changesets/* packages directly:**
   - Pros: Zero vendoring effort; automatic upstream updates
   - Cons: Blocked by upstream decisions; version conflicts across packages; types don't
     match our Effect-first design; upstream may deprecate or change APIs
   - Why rejected: Prior experience shows upstream is reluctant to make changes we need

3. **Fork the entire changesets monorepo:**
   - Pros: Complete control
   - Cons: Massive maintenance burden; divergence makes it hard to adopt upstream fixes;
     overkill for our needs
   - Why rejected: We only need a few specific modules, not the entire ecosystem

**Vendoring strategy:**

| Upstream Package | Strategy | Rationale |
| :--- | :--- | :--- |
| `@changesets/cli` | **Peer dependency** (keep) | Core orchestrator; consumers must install it |
| `@changesets/types` | **Vendor types** | Define our own Effect-native types; upstream types are loose (`any`) |
| `@changesets/get-github-info` | **Vendor + adapt** | Wrap in Effect services for error handling, caching, rate limiting |
| `@changesets/parse` | **Vendor** | Simple YAML frontmatter parsing; we use remark for the markdown body |
| `@changesets/read` | **Replace** | Trivial file reading; our CLI handles this with `@effect/platform` |
| `@changesets/git` | **Replace** | Not needed; Changesets handles git internally |

Vendored code lives in `src/vendor/` with clear attribution and license headers. The goal
is to minimize vendored surface area while maximizing our control over the integration
points that matter.

#### Decision 8: Dual API Surface -- Effect Primitives + Class-Based API

**Context:** This package is built with Effect internally (services, schemas, tagged errors,
layers). Some consumers are Effect-native and want direct access to our services and
schemas. Others want a simpler class-based API without learning Effect. The Silk Suite
itself may also want to expose parts of this package's services to other modules.

**Options considered:**

1. **Dual API: raw Effect exports + class-based wrapper (Chosen):**
   - Pros: Effect-native consumers get full composability (services, layers, schemas,
     tagged errors); class-based consumers get a simple, discoverable API; other Silk Suite
     packages can depend on our Effect services directly; follows the lint-staged precedent
     of static class + factory pattern
   - Cons: Two API surfaces to maintain; must ensure parity between them
   - Why chosen: Maximizes reuse. An Effect-native consumer can compose our
     `ChangelogService` into their own layer stack. A non-Effect consumer can use
     `Changelog.format(changeset)` without knowing Effect exists.

2. **Effect-only API:**
   - Pros: Simpler codebase; single API surface
   - Cons: Forces all consumers to learn Effect; limits adoption; the Changesets API
     itself uses plain async functions, not Effect
   - Why rejected: The Changesets API integration point (`getReleaseLine`) must return
     `Promise<string>`, not `Effect<string>`. We need a non-Effect bridge anyway.

3. **Class-based-only API (hide Effect internals):**
   - Pros: Simplest for consumers; no Effect leakage
   - Cons: Wastes the composability of our Effect implementation; other Silk Suite
     packages can't reuse our services; limits advanced use cases
   - Why rejected: We're investing in Effect specifically for composability; hiding it
     defeats the purpose

**API design:**

The main export (`.`) exposes both surfaces:

```typescript
// === Effect Primitives (for Effect-native consumers) ===

// Services
export { ChangelogService } from './services/changelog.js'
export { GitHubService } from './services/github.js'
export { MarkdownService } from './services/markdown.js'
export { ValidationService } from './services/validation.js'

// Layers
export { ChangelogLive } from './services/changelog.js'
export { GitHubLive, GitHubTest } from './services/github.js'
export { MarkdownLive } from './services/markdown.js'

// Schemas
export { ChangesetOptionsSchema } from './schemas/options.js'
export { CommitHashSchema } from './schemas/git.js'
export { GitHubInfoSchema } from './schemas/github.js'
export { SectionCategorySchema } from './schemas/categories.js'

// Tagged Errors
export { ChangesetValidationError } from './errors.js'
export { GitHubApiError } from './errors.js'
export { MarkdownParseError } from './errors.js'

// === Class-Based API (for higher-level consumers) ===

export { Changelog } from './api/changelog.js'
export { ChangesetLinter } from './api/linter.js'
export { ChangelogTransformer } from './api/transformer.js'
export { Categories } from './api/categories.js'
```

**Usage examples:**

```typescript
// Effect-native consumer
import { ChangelogService, GitHubLive } from '@savvy-web/changesets'

const program = Effect.gen(function* () {
  const changelog = yield* ChangelogService
  const line = yield* changelog.formatReleaseLine(changeset, type)
  return line
}).pipe(Effect.provide(GitHubLive))

// Class-based consumer
import { Changelog } from '@savvy-web/changesets'

const line = await Changelog.formatReleaseLine(changeset, type, {
  repo: 'savvy-web/changesets'
})
```

The class-based API internally runs Effect programs via `Effect.runPromise()`, providing
a clean bridge between the Effect world and the plain-async world that the Changesets
API requires.

### Constraints and Trade-offs

#### Constraint 1: Changesets Line-Level API

- **Description:** `getReleaseLine` sees ONE changeset at a time. There is no
  `getChangelogEntry` hook for aggregate processing. Version headings (`## X.Y.Z`) and
  bump-type section headings (`### Major/Minor/Patch Changes`) are generated internally
  by Changesets and are NOT customizable.
- **Impact:** Cannot merge sections or reorder content at the formatting layer. Must
  use post-transformation to achieve the desired output structure.
- **Mitigation:** The three-layer architecture with the post-transformation step.

#### Constraint 2: workflow-release-action Compatibility

- **Description:** The `workflow-release-action` parses CHANGELOG.md by extracting
  `## <version>` sections. The generated output MUST maintain this heading structure.
- **Impact:** Cannot change the version heading format; must work within the structure
  Changesets generates.
- **Mitigation:** Post-transformation only modifies content WITHIN version sections,
  never the version headings themselves.

#### Trade-off 1: Structured Changesets vs Simplicity

- **What we gained:** Rich, organized CHANGELOG output with section-aware formatting
- **What we sacrificed:** Simple flat-text changesets; contributors must learn the section
  structure
- **Why it's worth it:** Pre-validation with clear error messages makes the structure
  easy to follow; AI agents handle it naturally; the output quality justifies the input
  structure

---

## System Architecture

### Module Structure

```text
@savvy-web/changesets/
├── src/
│   ├── index.ts                    # Public API (types, utilities, remark plugins)
│   ├── types.ts                    # TypeScript type definitions
│   ├── changelog/                  # Layer 2: Changesets API formatter
│   │   ├── index.ts                # Entry point (exports ChangelogFunctions)
│   │   ├── getReleaseLine.ts       # Per-changeset formatting
│   │   ├── getDependencyReleaseLine.ts  # Dependency update formatting
│   │   ├── github.ts               # GitHub API integration (ported from prior art)
│   │   └── formatting.ts           # Entry formatting, PR/user attribution (ported)
│   ├── remark-lint/                # Layer 1: Pre-validation rules
│   │   ├── index.ts                # Lint preset entry point
│   │   ├── heading-hierarchy.ts    # Heading structure validation
│   │   ├── required-sections.ts    # Required section validation
│   │   └── content-structure.ts    # Content quality validation
│   ├── remark-transform/           # Layer 3: Post-processing
│   │   ├── index.ts                # Transform pipeline entry point
│   │   ├── merge-sections.ts       # Merge duplicate sections
│   │   ├── reorder-sections.ts     # Priority-based reordering
│   │   ├── deduplicate-items.ts    # Remove duplicate list items
│   │   └── normalize-format.ts     # Markdown normalization
│   ├── categories/                 # Section category system
│   │   ├── index.ts                # Category definitions and mapping
│   │   └── types.ts                # Category types
│   ├── cli/                        # Effect CLI
│   │   ├── index.ts                # Root command
│   │   └── commands/
│   │       ├── create.ts           # Interactive changeset creation
│   │       ├── lint.ts             # Validate changeset files
│   │       ├── transform.ts        # Post-process CHANGELOG.md
│   │       └── check.ts            # Full validation pipeline
│   └── utils/
│       ├── remark-pipeline.ts      # Shared unified pipeline config
│       ├── section-parser.ts       # Section extraction from content
│       ├── schemas.ts              # Effect Schema definitions (ported from valibot)
│       ├── commit-parser.ts        # Conventional commit parsing (ported from prior art)
│       ├── issue-refs.ts           # Issue reference extraction (ported from prior art)
│       └── logger.ts               # Environment-aware logging (CI vs local)
├── lib/configs/
│   └── lint-staged.config.ts       # Dogfooding config
├── dist/
│   ├── dev/                        # Development build with source maps
│   └── npm/                        # Production build for npm
└── package.json
```

### Component Diagram

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        @savvy-web/changesets                            │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                 Layer 1: Pre-Validation (remark-lint)              │  │
│  │                                                                    │  │
│  │  heading-hierarchy    Enforce h2 start, no h1, no depth skips     │  │
│  │  required-sections    Validate section headings match categories   │  │
│  │  content-structure    Content quality rules (non-empty, etc.)      │  │
│  │                                                                    │  │
│  │  Entry: @savvy-web/changesets/remark-lint                          │  │
│  │  Runs: CI, pre-commit hooks, CLI (savvy-changeset lint)           │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │              Layer 2: Changelog Formatter (Changesets API)         │  │
│  │                                                                    │  │
│  │  getReleaseLine          Parse sections, format per-changeset     │  │
│  │  getDependencyReleaseLine Format dependency updates               │  │
│  │                                                                    │  │
│  │  Entry: @savvy-web/changesets/changelog                            │  │
│  │  Runs: `changeset version` (via .changeset/config.json)           │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │           Layer 3: Post-Transformation (remark transformer)       │  │
│  │                                                                    │  │
│  │  merge-sections       Combine duplicate section headings          │  │
│  │  reorder-sections     Sort by priority (Breaking first)           │  │
│  │  deduplicate-items    Remove duplicate list items                 │  │
│  │  normalize-format     Clean up markdown formatting                │  │
│  │                                                                    │  │
│  │  Entry: @savvy-web/changesets/remark-transform                     │  │
│  │  Runs: After `changeset version` in ci:version script             │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     Category System                                │  │
│  │                                                                    │  │
│  │  Defines section categories, priority ordering, commit type        │  │
│  │  mapping, and heading format. Shared across all three layers.      │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                   CLI (savvy-changeset)                            │  │
│  │                                                                    │  │
│  │  create      Interactive guided changeset creation                │  │
│  │  lint        Validate changeset files against rules               │  │
│  │  transform   Post-process CHANGELOG.md after changeset version    │  │
│  │  check       Full validation pipeline (lint + structure check)    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │              GitHub Integration (ported from prior art)            │  │
│  │                                                                    │  │
│  │  github.ts          Batched API calls via @changesets/get-github-  │  │
│  │                     info (batch=10, streaming for >1000)           │  │
│  │  formatting.ts      Entry formatting, PR/user attribution,        │  │
│  │                     markdown link extraction                      │  │
│  │  commit-parser.ts   Conventional commit type(scope): desc parsing │  │
│  │  issue-refs.ts      closes/fixes/refs pattern extraction          │  │
│  │  logger.ts          @actions/core in CI, console.warn locally     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │              Validation (Effect Schema, ported from valibot)       │  │
│  │                                                                    │  │
│  │  schemas.ts         RepoSchema, CommitHashSchema, GitHubInfo-     │  │
│  │                     Schema, ChangesetOptionsSchema, etc.          │  │
│  │  validate/safe      Schema.decodeUnknownSync / decodeUnknownOption│  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    Shared Utilities                                │  │
│  │                                                                    │  │
│  │  remark-pipeline    Configured unified processor (parse/stringify) │  │
│  │  section-parser     Extract sections from changeset markdown       │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    Core Dependencies                               │  │
│  │                                                                    │  │
│  │  unified + remark-parse + remark-stringify   Markdown pipeline     │  │
│  │  unified-lint-rule                           Lint rule creation    │  │
│  │  unist-util-visit                            AST traversal        │  │
│  │  mdast-util-heading-range                    Section extraction    │  │
│  │  mdast-util-to-string                        Text extraction      │  │
│  │  @changesets/types                           Changesets API types  │  │
│  │  @changesets/get-github-info                 GitHub API client     │  │
│  │  effect + @effect/cli + @effect/platform     CLI + validation     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         Data Flow Overview                              │
│                                                                         │
│  1. WRITE PHASE (developer or AI agent creates changeset)               │
│                                                                         │
│     .changeset/my-change.md                                             │
│         │                                                               │
│         ▼                                                               │
│     Layer 1: remark-lint validates structure                            │
│         │  - Heading hierarchy correct?                                 │
│         │  - Section headings match known categories?                   │
│         │  - Content structure valid?                                   │
│         ▼                                                               │
│     Valid changeset file (or error reported)                            │
│                                                                         │
│  2. VERSION PHASE (changeset version generates CHANGELOG)               │
│                                                                         │
│     changeset version                                                   │
│         │                                                               │
│         ├── For each changeset file:                                    │
│         │       │                                                       │
│         │       ▼                                                       │
│         │   Layer 2: getReleaseLine(changeset, type, opts)              │
│         │       │  - Parse sections from changeset.summary              │
│         │       │  - Format each section with heading + content         │
│         │       │  - Return formatted markdown string                   │
│         │       ▼                                                       │
│         │   Formatted line for this changeset                           │
│         │                                                               │
│         ├── For dependency updates:                                     │
│         │       │                                                       │
│         │       ▼                                                       │
│         │   Layer 2: getDependencyReleaseLine(changesets, deps, opts)   │
│         │       │  - Format dependency version updates                  │
│         │       ▼                                                       │
│         │   Formatted dependency lines                                  │
│         │                                                               │
│         ▼                                                               │
│     Raw CHANGELOG.md (version heading + bump sections + lines)          │
│                                                                         │
│  3. TRANSFORM PHASE (post-process the generated CHANGELOG)              │
│                                                                         │
│     savvy-changeset transform                                           │
│         │                                                               │
│         ▼                                                               │
│     Layer 3: remark transform pipeline                                  │
│         │  - Parse CHANGELOG.md to MDAST                               │
│         │  - merge-sections: combine duplicate headings                 │
│         │  - reorder-sections: sort by priority within each version     │
│         │  - deduplicate-items: remove duplicate list items             │
│         │  - normalize-format: clean up whitespace/formatting           │
│         │  - Stringify MDAST back to markdown                           │
│         ▼                                                               │
│     Final CHANGELOG.md                                                  │
│                                                                         │
│  4. FORMAT PHASE (Biome normalizes markdown)                            │
│                                                                         │
│     biome format --write .                                              │
│         │                                                               │
│         ▼                                                               │
│     Biome-formatted CHANGELOG.md (ready for commit)                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Changesets API Integration

### Core Types

The Changesets changelog format API from `@changesets/types`:

```typescript
type VersionType = 'major' | 'minor' | 'patch';

interface NewChangesetWithCommit {
  id: string;
  summary: string;         // Raw markdown content from changeset file
  releases: Array<{
    name: string;          // Package name
    type: VersionType;     // Bump type
  }>;
  commit?: string;         // Git commit SHA (optional)
}

interface ModCompWithPackage {
  name: string;
  type: VersionType;
  oldVersion: string;
  newVersion: string;
  changesets: string[];
  packageJson: PackageJSON;
}

type GetReleaseLine = (
  changeset: NewChangesetWithCommit,
  type: VersionType,
  changelogOpts: null | Record<string, any>
) => Promise<string>;

type GetDependencyReleaseLine = (
  changesets: NewChangesetWithCommit[],
  dependenciesUpdated: ModCompWithPackage[],
  changelogOpts: any
) => Promise<string>;

type ChangelogFunctions = {
  getReleaseLine: GetReleaseLine;
  getDependencyReleaseLine: GetDependencyReleaseLine;
};
```

### Key API Constraints

1. **Line-level only**: `getReleaseLine` sees ONE changeset at a time, not the full changelog
2. **No aggregate hook**: There is no `getChangelogEntry` or similar hook for post-processing
   the assembled changelog
3. **Fixed structure**: Version headings (`## X.Y.Z`) and bump-type sections
   (`### Major/Minor/Patch Changes`) are generated internally by Changesets
4. **Summary is raw markdown**: `changeset.summary` contains the raw markdown content from
   the changeset file (everything after the YAML frontmatter)
5. **Commit is optional**: The `commit` field may be undefined
6. **Default export required**: The module must export `{ getReleaseLine, getDependencyReleaseLine }`
   as its default export

### Configuration

In `.changeset/config.json`:

```json
{
  "changelog": ["@savvy-web/changesets/changelog", { "repo": "savvy-web/package-name" }]
}
```

The second element of the array is passed as `changelogOpts` to both functions. Options are
validated at runtime using Effect Schema (ported from prior art's valibot validation):

**Required options:**

- `repo`: GitHub repository identifier in `owner/repository` format (e.g., `"savvy-web/changesets"`).
  Validated via regex pattern `^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$`. If missing or invalid,
  descriptive error messages guide the user to correct their `.changeset/config.json`.

**Planned options (new):**

- `commitLinks`: Whether to include commit links in output (default: `true`)
- `prLinks`: Whether to include PR links in output (default: `true`)

**Error messages (ported from prior art):**

The prior art provides excellent developer-facing error messages for configuration issues:

- Missing options: `"Configuration is required. Add options to your changesets config: ..."`
- Missing repo: `"Repository name is required. Add the \"repo\" option to ..."`
- Invalid repo format: `"Invalid repository format: \"<value>\". Expected format is \"owner/repository\""`

These error messages and the special `ChangesetOptionsSchema` handling should be preserved
in the Effect Schema migration.

---

## Three-Layer Processing Architecture

### Layer 1: Pre-Validation (remark-lint)

Custom remark-lint rules that validate `.changeset/*.md` files match the required structure.
These run in CI, pre-commit hooks, or via the CLI.

**Entry point:** `@savvy-web/changesets/remark-lint`

#### Rule: heading-hierarchy

Validates heading structure in changeset files:

- Changeset content must start with h2 (`##`) headings for sections
- No h1 (`#`) headings allowed (the package name comes from frontmatter)
- No heading depth skips (h2 directly to h4)
- h3 headings are allowed as subsections under h2 section headings

```markdown
<!-- Valid -->
## Features

### New Fluent API

Description here.

<!-- Invalid: starts with h1 -->
# Features

<!-- Invalid: skips from h2 to h4 -->
## Features

#### Sub-sub-section
```

#### Rule: required-sections

Validates that section headings match known categories:

- All h2 headings must match a recognized section category
- Warns on unrecognized section headings (typo detection)
- Does not require specific sections to be present (any combination is valid)

#### Rule: content-structure

Validates content quality:

- Sections must not be empty (heading with no content)
- Code blocks must have language identifiers
- List items should have meaningful content (not just whitespace)

### Layer 2: Changelog Formatter (Changesets API)

The custom `getReleaseLine` and `getDependencyReleaseLine` functions that Changesets calls
during `changeset version`.

**Entry point:** `@savvy-web/changesets/changelog`

#### getReleaseLine

1. Validates options using Effect Schema (repo format, required fields)
2. Receives a single changeset with its summary (raw markdown)
3. Parses the summary using remark to extract MDAST
4. Walks the AST to identify section headings and their content
5. For each section found:
   - Maps the heading to a known category
   - Formats the section content (preserving sub-headings, code blocks, lists)
   - Includes the section heading in the output
6. If the changeset has a commit:
   - Fetches GitHub info via `@changesets/get-github-info` (PR number, user, links)
   - Validates response with Effect Schema (graceful degradation on failure)
   - Appends commit link, PR reference, and user attribution
7. Extracts issue references (closes/fixes/refs) from changeset body
8. Returns the formatted markdown string for this changeset

**Key behavior:** The formatter preserves section headings in its output. When Changesets
assembles the final CHANGELOG, multiple changesets with the same section (e.g., both have
`## Features`) will produce duplicate section headings. This is intentional -- Layer 3
handles merging.

**GitHub integration (ported from prior art):** All GitHub API calls use graceful degradation.
If `getInfo()` fails, the formatter constructs commit links manually from the hash. API
responses are validated but invalid responses fall back to raw data. Environment-aware logging
reports failures to `@actions/core.warning()` in CI or `console.warn` locally.

#### getDependencyReleaseLine

1. Validates options using Effect Schema
2. Receives all changesets and the list of updated dependencies
3. Fetches GitHub commit info in batches of 10 (ported batching strategy from prior art)
4. For >1000 changesets, uses streaming mode with 50-item chunks (ported from prior art)
5. Formats a clean dependency update list showing package name, old version, and new version
6. Includes commit links with graceful fallback formatting
7. Logs API failure metrics (success rate percentage)
8. Groups under a `## Dependencies` heading if not already categorized

### Layer 3: Post-Transformation (remark transformer)

A remark transform pipeline that runs after `changeset version` generates the raw CHANGELOG.md.
This layer compensates for the line-level API limitation by operating on the full document.

**Entry point:** `@savvy-web/changesets/remark-transform`

#### Plugin: merge-sections

Finds duplicate section headings within each version block and merges their content:

```markdown
<!-- Before (raw output from multiple changesets) -->
## Features
- Added fluent API

## Features
- Added batch processing

<!-- After merging -->
## Features
- Added fluent API
- Added batch processing
```

Operates within each `## <version>` block independently. Never merges across versions.

#### Plugin: reorder-sections

Reorders sections within each version block according to the priority table (see
[Section Categories](#section-categories)). Breaking Changes always come first,
Dependencies always come last.

#### Plugin: deduplicate-items

Removes duplicate list items within merged sections. Uses text content comparison
(after normalizing whitespace) to detect duplicates.

#### Plugin: normalize-format

Cleans up markdown formatting:

- Ensures consistent blank lines between sections
- Normalizes heading levels
- Trims trailing whitespace
- Ensures file ends with a newline

---

## Section Categories

Changeset content uses section headings that map to conventional commit types. Each category
has a priority that determines ordering in the final CHANGELOG.

| Priority | Section Heading | Commit Types | Prior Art Category | Description |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Breaking Changes | `feat!`, `fix!`, any `!` suffix | *(none)* | Backward-incompatible changes |
| 2 | Features | `feat` | Features | New functionality |
| 3 | Bug Fixes | `fix` | Bug Fixes | Bug corrections |
| 4 | Performance | `perf` | Performance | Performance improvements |
| 5 | Documentation | `docs` | Documentation | Documentation changes |
| 6 | Refactoring | `refactor` | Refactoring | Code restructuring |
| 7 | Tests | `test` | Tests | Test additions or modifications |
| 8 | Build System | `build` | Build System | Build configuration changes |
| 9 | CI | `ci` | CI | Continuous integration changes |
| 10 | Dependencies | `deps`, `chore(deps)` | *(none)* | Dependency updates |
| 11 | Maintenance | `chore`, `style` | Maintenance | General maintenance |
| 12 | Reverts | `revert` | Reverts | Reverted changes |
| 13 | Other | *(unrecognized)* | Other | Uncategorized changes |

**Changes from prior art categories:**

- **Added:** Breaking Changes (priority 1) -- the prior art has no dedicated breaking changes
  section; the `!` suffix in conventional commits was not handled
- **Added:** Dependencies (priority 10) -- the prior art handles dependency updates via
  `getDependencyReleaseLine` but does not produce a section heading for them
- **Split:** Prior art's "Internal" is decomposed into Build System, CI, and Maintenance for
  finer granularity (consistent with prior art's own `typeToCategory` mapping)
- **Preserved:** Features, Bug Fixes, Performance, Documentation, Refactoring, Tests, Reverts,
  Other remain from the prior art's `categoryOrder` array
- **style commits:** Mapped to Maintenance (prior art mapped `style` to "Other")

### Category System Design

The category system is the shared data model used across all three layers:

```typescript
interface SectionCategory {
  /** Display heading used in CHANGELOG output */
  readonly heading: string;
  /** Priority for ordering (lower = higher priority) */
  readonly priority: number;
  /** Conventional commit types that map to this category */
  readonly commitTypes: readonly string[];
  /** Brief description for documentation */
  readonly description: string;
}
```

The category definitions live in `src/categories/index.ts` and are imported by:

- **Layer 1 (remark-lint):** Uses category headings to validate section names
- **Layer 2 (changelog formatter):** Uses categories to identify and format sections
- **Layer 3 (remark-transform):** Uses priority ordering for section reordering

---

## Contributor Tracking

Release notes should attribute work to contributors, making it easy to see who contributed
what across a release. This builds on the prior art's user attribution (`Thanks @username!`)
but provides a more structured approach using GFM footnotes.

### How It Works

1. **Layer 2 (`getReleaseLine`)** fetches GitHub info for each changeset's commit via
   `@changesets/get-github-info`, which returns the PR author and any co-authors
2. The formatter collects contributor usernames and associates them with their contributions
3. **Layer 3 (post-transform)** aggregates contributors across all changesets in a version
   block and generates a **Contributors** footnote section at the bottom of each version

### Output Format

Contributors appear as GFM footnotes within each version block, keeping the main content
clean while providing attribution:

```markdown
## 1.2.0

### Features

- Added fluent testing API [^1]
- Added batch processing support [^2]

### Bug Fixes

- Fixed race condition in queue processor [^1]

### Contributors

[^1]: [@spencerbeggs](https://github.com/spencerbeggs)
[^2]: [@contributor](https://github.com/contributor)
```

For simple releases with a single contributor, footnotes are omitted and the contributor
is listed inline at the end of the version block.

### Data Model

```typescript
interface ContributorInfo {
  /** GitHub username */
  readonly username: string;
  /** GitHub profile URL */
  readonly profileUrl: string;
  /** PR numbers this contributor authored in this release */
  readonly pullRequests: readonly number[];
  /** Changeset IDs this contributor is associated with */
  readonly changesetIds: readonly string[];
}
```

The contributor data is collected in Layer 2 (per-changeset) and aggregated in Layer 3
(per-version-block). Layer 3's `merge-sections` plugin handles deduplication of
contributor footnotes when merging sections from multiple changesets.

---

## Issue and Ticket Linking

Closed issues and tickets should be linked to their proper place in the release notes,
not just listed generically. This extends the prior art's `closes/fixes/refs` pattern
extraction with section-aware placement and GFM link formatting.

### Linking Strategies

#### 1. Inline References in Changeset Content

Authors (human or AI) can reference issues directly in changeset markdown. The formatter
preserves these as-is:

```markdown
## Bug Fixes

Fixed the race condition in queue processor that caused
[#42](https://github.com/savvy-web/changesets/issues/42) to fail under load.
```

#### 2. Automatic Extraction from Commit Messages

When `getReleaseLine` has access to a commit hash, it fetches PR info from GitHub.
The PR body and commit messages are scanned for issue references using these patterns
(ported from prior art):

- `closes #123`, `close #123`
- `fixes #123`, `fix #123`
- `refs #123`, `ref #123`
- `resolves #123`, `resolve #123`

Extracted references are appended as links to the relevant changeset entry.

#### 3. Section-Aware Placement

Issue links are placed in the section where the fix/feature lives, not in a separate
generic section. If a changeset's `## Bug Fixes` section closes `#42`, the link appears
within that section:

```markdown
### Bug Fixes

- Fixed race condition in queue processor (closes [#42])

[#42]: https://github.com/savvy-web/changesets/issues/42
```

GFM reference-style links (`[#42]: url`) are collected at the bottom of each version
block to keep the content readable in raw markdown form.

#### 4. Deduplication in Post-Transform

When multiple changesets reference the same issue, Layer 3's `deduplicate-items` plugin
ensures the link definition appears only once in the reference section at the bottom of
the version block.

### Configuration

Issue linking is configured via `changelogOpts`:

```json
{
  "changelog": [
    "@savvy-web/changesets/changelog",
    {
      "repo": "savvy-web/changesets",
      "issueLinks": true,
      "issuePrefixes": ["#", "GH-"]
    }
  ]
}
```

- `issueLinks`: Enable/disable automatic issue link extraction (default: `true`)
- `issuePrefixes`: Prefixes to recognize as issue references (default: `["#"]`)

---

## Changeset File Format

Individual `.changeset/*.md` files use this structure:

````markdown
---
"@savvy-web/some-package": minor
---

## Features

### New Fluent API

We added a fluent testing API. Multiple paragraphs are supported.

```typescript
import { TestMock } from "test-package";
const mock = TestMock.create({});
```

## Tests

- Added unit tests for fluent API
- Updated integration tests

````

### Format Rules

1. **YAML frontmatter** is standard Changesets format (package name to bump type mapping)
2. **Section headings** (h2) must match a known category from the category table
3. **Sub-headings** (h3) are optional and provide finer-grained organization within a section
4. **Content** under sections can include paragraphs, lists, code blocks, and inline formatting
5. **Multiple sections** per changeset are encouraged -- a single PR may add features AND tests
6. **Empty sections** are not allowed -- every section heading must have content

### Example: Complex Changeset

```markdown
---
"@savvy-web/changesets": minor
---

## Features

### Structured Changelog Sections

Added section-aware changelog formatting. Changeset files now use h2 headings
to categorize changes:

- `## Features` for new functionality
- `## Bug Fixes` for corrections
- `## Breaking Changes` for backward-incompatible changes

The formatter parses these sections and produces organized CHANGELOG output.

### Post-Processing Pipeline

After `changeset version` generates the raw CHANGELOG, a remark transform
pipeline merges duplicate sections, reorders by priority, and deduplicates
list items.

## Documentation

- Added architecture design document
- Updated CLAUDE.md with design doc pointers

## Tests

- Unit tests for getReleaseLine with section parsing
- Unit tests for getDependencyReleaseLine formatting
- Integration tests for the full three-layer pipeline
```

---

## Export Map and CLI

### Package Exports

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./changelog": "./src/changelog/index.ts",
    "./remark-lint": "./src/remark-lint/index.ts",
    "./remark-transform": "./src/remark-transform/index.ts"
  }
}
```

| Export Path | Purpose | API Surface | Consumers |
| :--- | :--- | :--- | :--- |
| `.` | Main library: Effect primitives + class-based API | Dual (see below) | Direct import, Silk Suite packages |
| `./changelog` | Changesets API formatter | Plain async (bridge) | `.changeset/config.json` |
| `./remark-lint` | Custom lint rules for changeset validation | Remark plugin API | CI, pre-commit, CLI |
| `./remark-transform` | Post-processing transformation pipeline | Remark plugin API | CI script, CLI |

### Dual API Surface (main export)

The `.` export exposes two complementary API surfaces per [Decision 8](#decision-8-dual-api-surface----effect-primitives--class-based-api):

**Effect Primitives** -- for Effect-native consumers and other Silk Suite packages:

```typescript
// Services (compose into your own Layer stack)
import { ChangelogService, GitHubService, MarkdownService } from '@savvy-web/changesets'

// Layers (provide to Effect programs)
import { ChangelogLive, GitHubLive, GitHubTest } from '@savvy-web/changesets'

// Schemas (validate external data, define branded types)
import { ChangesetOptionsSchema, CommitHashSchema } from '@savvy-web/changesets'

// Tagged Errors (pattern match in error channels)
import { ChangesetValidationError, GitHubApiError } from '@savvy-web/changesets'
```

**Class-Based API** -- for higher-level consumers who don't use Effect:

```typescript
import { Changelog, ChangesetLinter, ChangelogTransformer, Categories } from '@savvy-web/changesets'

// Format a release line (runs Effect internally, returns Promise)
const line = await Changelog.formatReleaseLine(changeset, type, { repo: 'savvy-web/foo' })

// Validate changeset files
const result = await ChangesetLinter.validate('.changeset/')

// Transform a CHANGELOG.md
const transformed = await ChangelogTransformer.transform('CHANGELOG.md')

// Look up categories
const ordered = Categories.ordered()  // Returns categories sorted by priority
const cat = Categories.fromCommitType('feat')  // Returns SectionCategory
```

The class-based API internally runs Effect programs via `Effect.runPromise()`, providing
a clean bridge. The `./changelog` export uses this bridge since Changesets requires plain
`Promise<string>` return types from `getReleaseLine`.

### CLI Binary

**Binary name:** `savvy-changeset`

**Framework:** Effect CLI (`@effect/cli` + `@effect/platform` + `@effect/platform-node`)

**Commands:**

| Command | Description | Usage |
| :--- | :--- | :--- |
| `savvy-changeset create` | Interactive guided changeset creation | Developer workflow |
| `savvy-changeset lint` | Validate changeset files against remark-lint rules | CI, pre-commit |
| `savvy-changeset transform` | Post-process CHANGELOG.md with remark-transform pipeline | ci:version script |
| `savvy-changeset check` | Run full validation pipeline (lint + structure) | CI gate |

### CI Integration

The `ci:version` script in `package.json` integrates all layers:

```json
{
  "scripts": {
    "ci:version": "changeset version && savvy-changeset transform && biome format --write ."
  }
}
```

This runs:

1. `changeset version` -- Changesets calls Layer 2 (getReleaseLine) to generate CHANGELOG.md
2. `savvy-changeset transform` -- Layer 3 post-processes the CHANGELOG.md
3. `biome format --write .` -- Biome normalizes all formatting

---

## Dependencies

### Production Dependencies

| Package | Purpose | Layer | Source |
| :--- | :--- | :--- | :--- |
| `unified` | Core processing pipeline | All layers | New |
| `remark-parse` | Markdown to MDAST parser | All layers | New |
| `remark-stringify` | MDAST to markdown stringifier | All layers | New |
| `remark-gfm` | GFM support (footnotes, tables, autolinks, strikethrough, task lists) | All layers | New |
| `unified-lint-rule` | Lint rule creation utility | Layer 1 | New |
| `unist-util-visit` | AST node traversal | All layers | New |
| `mdast-util-heading-range` | Section extraction by heading | Layers 2, 3 | New |
| `mdast-util-to-string` | Text content extraction from nodes | All layers | New |
| `effect` | Effect runtime + Schema (replaces valibot) | All layers | New |
| `@effect/cli` | CLI command framework | CLI | New |
| `@effect/platform` | Platform abstraction | CLI, Services | New |
| `@effect/platform-node` | Node.js platform implementation | CLI | New |

### Vendored Code (src/vendor/)

Per [Decision 7](#decision-7-vendorfork-changesets-internals-rather-than-depend-on-upstream),
these upstream packages are vendored rather than depended on directly. This gives us full
control over the integration points that matter while keeping `@changesets/cli` as the
only upstream runtime dependency.

| Upstream Package | Vendored As | What We Take | Modifications |
| :--- | :--- | :--- | :--- |
| `@changesets/types` | `src/vendor/types.ts` | `ChangelogFunctions`, `NewChangesetWithCommit`, `ModCompWithPackage`, `VersionType` | Redefine as Effect Schemas with proper branding; replace loose `any` types with strict alternatives |
| `@changesets/get-github-info` | `src/vendor/github-info.ts` | `getInfo()` function, GitHub API fetching logic | Wrap in Effect `GitHubService`; add proper error channel; integrate with Effect retry/caching |
| `@changesets/parse` | `src/vendor/parse.ts` | YAML frontmatter parsing | Minimal; we use remark for the markdown body |
| `@actions/core` | `src/vendor/ci-logger.ts` | `warning()`, `info()` logging functions | Replace with Effect Logger + custom CI log layer (detects `GITHUB_ACTIONS` env) |

Each vendored file includes:

- License header with attribution to the original package
- Link to the upstream source
- Documentation of modifications

**Not vendored (removed):**

| Package | Prior Art Usage | Reason Removed |
| :--- | :--- | :--- |
| `valibot` | Runtime validation schemas | Replaced by Effect Schema |
| `@changesets/git` | Git operations | Not needed; Changesets CLI handles git internally |
| `@changesets/read` | Reading changeset files | Replaced by `@effect/platform` FileSystem |

### Peer Dependencies

| Package | Purpose | Notes |
| :--- | :--- | :--- |
| `@changesets/cli` | The changesets CLI that consumers must install | Only upstream runtime dep; orchestrates version/publish lifecycle |

### Dev Dependencies

Inherited from the template repository (Rslib, Turbo, Vitest, Biome, etc.).

---

## Integration Points

### 1. .changeset/config.json

Each consuming repository configures the changelog formatter:

```json
{
  "changelog": ["@savvy-web/changesets/changelog", { "repo": "savvy-web/package-name" }]
}
```

### 2. ci:version Script

Each consuming repository updates its `ci:version` script:

```json
{
  "scripts": {
    "ci:version": "changeset version && savvy-changeset transform && biome format --write ."
  }
}
```

### 3. Pre-Commit / CI Validation

Changeset files can be validated in pre-commit hooks or CI:

```bash
savvy-changeset lint
```

### 4. workflow-release-action

No changes needed to `workflow-release-action`. It reads `## <version>` sections from
CHANGELOG.md, which our output preserves. The version heading format is controlled by
Changesets internally and we do not modify it.

### 5. pnpm-plugin-silk

Once published, `@savvy-web/changesets` should be added to `catalog:silk` in
pnpm-plugin-silk so all Silk Suite repos get a managed version.

### 6. Dogfooding

This repository itself will use `@savvy-web/changesets/changelog` in its own
`.changeset/config.json` once implemented. The `ci:version` script will include
the transform step.

---

## Compatibility Requirements

The generated CHANGELOG.md MUST maintain compatibility with:

### workflow-release-action

The release action parses CHANGELOG.md by extracting content between `## <version>` headings.
Our output must:

- Preserve the `## X.Y.Z` heading format that Changesets generates
- Not introduce additional h2 headings that could be mistaken for version headings
  (section headings within version blocks use h3 or are nested appropriately)
- Maintain valid markdown structure

### GitHub Flavored Markdown (GFM)

The output uses GFM via `remark-gfm` and must render correctly on GitHub:

- **Footnotes**: Used for contributor attribution and issue references without cluttering
  the main content (e.g., `[^1]` links to contributor details at the bottom of a version block)
- **Autolinks**: URLs are automatically linked
- **Tables**: Available for structured dependency update summaries
- **Strikethrough**: Available for deprecation notices
- **Task lists**: Available for migration checklists in breaking changes
- Code blocks with language identifiers
- Proper heading hierarchy
- Working relative links (if any)

### Biome Markdown Formatting

The output must survive Biome formatting without structural changes:

- `biome format --write .` runs after our transform step
- Biome may normalize whitespace, line lengths, and formatting
- Our output should not depend on specific whitespace patterns

---

## Testing Strategy

The test suite is designed around a **fixture-driven approach** that makes it easy to iterate
on output quality. Fixtures represent real-world package structures, commit patterns, and
changeset styles so that changes to formatting logic are immediately visible as diffs against
expected output.

### Fixture-Driven Test Harness

The core testing pattern: each scenario is a directory containing input fixtures and
expected output snapshots. Tests run the full pipeline (or individual layers) against
the input and compare to expected output. This makes it trivial to add new scenarios,
visually review formatting changes, and catch regressions.

```text
__fixtures__/
├── scenarios/
│   ├── single-package-simple/
│   │   ├── .changeset/
│   │   │   ├── config.json             # Changeset config for this scenario
│   │   │   └── add-feature.md          # Single simple changeset
│   │   ├── package.json                # Single-package structure
│   │   ├── expected-changelog.md       # Expected CHANGELOG output
│   │   └── scenario.json               # Metadata: description, tags, options
│   │
│   ├── single-package-multi-changeset/
│   │   ├── .changeset/
│   │   │   ├── config.json
│   │   │   ├── feat-fluent-api.md      # Feature changeset
│   │   │   ├── fix-race-condition.md   # Bug fix changeset
│   │   │   ├── test-coverage.md        # Test changeset
│   │   │   └── deps-update.md          # Dependency update changeset
│   │   ├── package.json
│   │   ├── expected-changelog.md       # Merged, reordered, deduplicated
│   │   └── scenario.json
│   │
│   ├── monorepo-multi-package/
│   │   ├── .changeset/
│   │   │   ├── config.json
│   │   │   ├── shared-feature.md       # Changeset touching multiple packages
│   │   │   └── pkg-a-fix.md            # Changeset for one package
│   │   ├── packages/
│   │   │   ├── pkg-a/package.json
│   │   │   └── pkg-b/package.json
│   │   ├── package.json                # Workspace root
│   │   ├── expected-changelog-pkg-a.md
│   │   ├── expected-changelog-pkg-b.md
│   │   └── scenario.json
│   │
│   ├── breaking-changes/
│   │   ├── .changeset/
│   │   │   ├── config.json
│   │   │   ├── drop-cjs.md            # Breaking: drop CommonJS
│   │   │   └── new-api.md             # Feature alongside breaking change
│   │   ├── package.json
│   │   ├── expected-changelog.md       # Breaking Changes section first
│   │   └── scenario.json
│   │
│   ├── rich-content/
│   │   ├── .changeset/
│   │   │   ├── config.json
│   │   │   └── detailed-feature.md     # Code blocks, subsections, GFM
│   │   ├── package.json
│   │   ├── expected-changelog.md       # Preserves GFM formatting
│   │   └── scenario.json
│   │
│   ├── contributor-tracking/
│   │   ├── .changeset/
│   │   │   ├── config.json
│   │   │   ├── alice-feature.md        # commit by alice
│   │   │   ├── bob-fix.md             # commit by bob
│   │   │   └── alice-tests.md         # another commit by alice
│   │   ├── package.json
│   │   ├── expected-changelog.md       # Footnotes with contributors
│   │   ├── github-api-responses.json   # Mocked GitHub API responses
│   │   └── scenario.json
│   │
│   ├── issue-linking/
│   │   ├── .changeset/
│   │   │   ├── config.json
│   │   │   ├── fix-closes-42.md        # "closes #42" in body
│   │   │   ├── feat-refs-100.md        # "refs #100" inline
│   │   │   └── fix-also-closes-42.md   # Duplicate issue reference
│   │   ├── package.json
│   │   ├── expected-changelog.md       # Deduplicated issue links
│   │   ├── github-api-responses.json
│   │   └── scenario.json
│   │
│   ├── dependency-updates/
│   │   ├── .changeset/
│   │   │   ├── config.json
│   │   │   └── update-deps.md          # Dependency bump changeset
│   │   ├── package.json
│   │   ├── dependency-updates.json     # ModCompWithPackage[] mock data
│   │   ├── expected-changelog.md       # Formatted dependency section
│   │   └── scenario.json
│   │
│   ├── large-release/
│   │   ├── .changeset/
│   │   │   ├── config.json
│   │   │   └── [50+ changeset files]   # Stress test: many changesets
│   │   ├── package.json
│   │   ├── expected-changelog.md
│   │   └── scenario.json
│   │
│   └── conventional-commits/
│       ├── .changeset/
│       │   ├── config.json
│       │   ├── feat-scope.md           # feat(parser): ...
│       │   ├── fix-no-scope.md         # fix: ...
│       │   ├── feat-breaking.md        # feat!: ...
│       │   ├── chore-deps.md           # chore(deps): ...
│       │   └── unknown-type.md         # yolo: ... (unrecognized)
│       ├── package.json
│       ├── expected-changelog.md       # All types properly categorized
│       └── scenario.json
│
├── lint-rules/
│   ├── valid/
│   │   ├── simple-sections.md          # Valid: basic h2 sections
│   │   ├── with-subsections.md         # Valid: h2 + h3 hierarchy
│   │   ├── code-blocks.md             # Valid: code blocks with lang
│   │   ├── gfm-features.md            # Valid: footnotes, tables
│   │   └── all-categories.md          # Valid: every known category
│   └── invalid/
│       ├── h1-heading.md              # Invalid: starts with h1
│       ├── heading-skip.md            # Invalid: h2 then h4
│       ├── unknown-section.md         # Invalid: unrecognized heading
│       ├── empty-section.md           # Invalid: heading with no content
│       ├── no-code-lang.md            # Invalid: code block without lang
│       └── expected-errors.json       # Expected lint messages per file
│
└── transform/
    ├── merge-sections/
    │   ├── input.md                   # Duplicate ## Features sections
    │   └── expected.md                # Merged into one
    ├── reorder-sections/
    │   ├── input.md                   # Sections in random order
    │   └── expected.md                # Reordered by priority
    ├── deduplicate-items/
    │   ├── input.md                   # Duplicate list items
    │   └── expected.md                # Deduplicated
    ├── normalize-format/
    │   ├── input.md                   # Inconsistent whitespace
    │   └── expected.md                # Normalized
    ├── contributor-footnotes/
    │   ├── input.md                   # Raw footnotes from multiple changesets
    │   └── expected.md                # Merged, deduplicated footnotes
    ├── issue-link-refs/
    │   ├── input.md                   # Duplicate [#42] reference defs
    │   └── expected.md                # Deduplicated reference links
    └── full-pipeline/
        ├── input.md                   # Raw changeset version output
        └── expected.md                # After all transforms
```

### Scenario Configuration

Each scenario directory includes a `scenario.json` that configures the test:

```typescript
interface TestScenario {
  /** Human-readable description of what this scenario tests */
  description: string;
  /** Tags for filtering: "single-package", "monorepo", "gfm", "breaking", etc. */
  tags: string[];
  /** Changeset config overrides for this scenario */
  changelogOpts?: Record<string, unknown>;
  /** Whether to mock GitHub API calls */
  mockGitHub?: boolean;
  /** Path to GitHub API mock responses (relative to scenario dir) */
  githubMockFile?: string;
  /** Packages in this scenario (for monorepo tests) */
  packages?: string[];
  /** Expected version bump type for the primary package */
  expectedBumpType?: 'major' | 'minor' | 'patch';
}
```

### Test Runner Utilities

A shared test runner makes it easy to add new scenarios without boilerplate:

```typescript
import { runScenario, runLintFixture, runTransformFixture } from './test-utils.js'

// Full pipeline scenario test
describe('single-package-simple', () => {
  it('generates expected changelog', async () => {
    await runScenario('single-package-simple')
  })
})

// Lint rule fixture test
describe('heading-hierarchy', () => {
  it('accepts valid headings', async () => {
    await runLintFixture('valid/simple-sections.md', { expectedErrors: 0 })
  })
  it('rejects h1 headings', async () => {
    await runLintFixture('invalid/h1-heading.md', {
      expectedErrors: [{ rule: 'changeset:heading-hierarchy', line: 1 }]
    })
  })
})

// Transform plugin fixture test
describe('merge-sections', () => {
  it('merges duplicate sections', async () => {
    await runTransformFixture('merge-sections')
  })
})
```

### Snapshot Testing for Output Quality

In addition to fixture comparison, Vitest snapshots capture the exact output for quick
iteration:

- `pnpm vitest run --update` regenerates snapshots after intentional formatting changes
- Snapshot diffs in PRs make formatting changes immediately visible in code review
- Each scenario's `expected-changelog.md` serves as both a test fixture AND documentation
  of the expected output format

### Unit Tests

**Location:** `src/**/*.test.ts`

**Coverage target:** 90%

**What to test per module:**

- **Category system:** Mapping, priority ordering, heading lookup, unknown type fallback
- **Section parser:** Extracting sections from changeset markdown, edge cases (no sections,
  preamble text, nested headings)
- **getReleaseLine:** Formatting for each scenario type (simple, multi-section, GFM,
  contributor attribution, issue links)
- **getDependencyReleaseLine:** Dependency update formatting, batching, error fallbacks
- **Each remark-lint rule:** Valid inputs pass, invalid inputs produce expected messages
  with correct line/column positions
- **Each remark-transform plugin:** Input/expected output pairs for each transformation
- **Contributor tracking:** Footnote generation, deduplication, single-contributor inline
- **Issue linking:** Pattern extraction, section-aware placement, reference deduplication
- **CLI commands:** Argument parsing, file discovery, error handling

### Test Patterns from Prior Art

The prior art's test suite (`workflow/pkgs/changelog/__test__/`) provides reference patterns:

**Mocking strategy:**

```typescript
vi.mock("@changesets/get-github-info", () => ({ getInfo: vi.fn() }));
vi.mock("@actions/core", () => ({ warning: vi.fn() }));
```

**Key scenarios to port:**

| Scenario | Prior Art Test | New Package Equivalent |
| :--- | :--- | :--- |
| All 11 commit type categorizations | `categorizeChangeset` suite | Category system tests |
| Issue ref pattern variations | `parseIssueReferences` suite | Issue linking tests |
| Conventional commit parsing | `parseCommitMessage` suite | Commit parser tests |
| GitHub info with/without PR | `getReleaseLine` edge cases | Layer 2 formatter tests |
| API failure graceful degradation | Reject mock tests | Layer 2 formatter tests |
| Batched API calls | `getDependencyReleaseLine` tests | Layer 2 formatter tests |
| Streaming mode (>1000 items) | `Memory optimization` suite | Layer 2 formatter tests |
| Schema validation edge cases | `validation.test.ts` | Effect Schema tests |

### Integration Tests

**Location:** `src/**/*.integration.test.ts`

**What to test:**

- Full three-layer pipeline: changeset files through to final CHANGELOG for each scenario
- Remark pipeline: parse, transform, stringify round-trips preserve content
- CLI command execution with fixture scenarios
- Compatibility: output passes workflow-release-action's changelog section parser
- GFM rendering: footnotes, tables, links round-trip through remark-gfm
- Biome compatibility: output survives `biome format` without structural changes

### GitHub API Mocking

Scenarios that test contributor tracking and issue linking include
`github-api-responses.json` files with mocked responses from `@changesets/get-github-info`.
The test harness injects these via a mock layer so tests are deterministic and don't
require network access.

```typescript
interface MockGitHubResponse {
  commits: Record<string, {
    user: string;
    pull: number | null;
    links: { commit: string; pull: string | null; user: string };
  }>;
}
```

---

## Future Enhancements

### Short-term (Post-MVP)

- [ ] Configurable section categories (allow consumers to add custom sections)
- [ ] `savvy-changeset create` interactive mode with section selection
- [ ] Migration guide from `@savvy-web/changelog` to `@savvy-web/changesets`

### Medium-term

- [ ] Remark plugin for CHANGELOG table of contents generation
- [ ] Section-level statistics (count of changes per category)
- [ ] Integration with `@savvy-web/lint-staged` for changeset validation in pre-commit
- [ ] Changeset template system for AI agents (structured prompts)
- [ ] Replace `@actions/core` with Effect Logger + custom CI layer

### Long-term

- [ ] Multi-package changelog aggregation (monorepo-wide view)
- [ ] Changelog diffing tool (compare between versions)
- [ ] RSS/Atom feed generation from CHANGELOG
- [ ] Migration tool from default formatter to structured format

### Carried Forward from Prior Art (included in MVP)

These capabilities from `@savvy-web/changelog` are included in the initial implementation,
not future enhancements:

- [x] GitHub PR link and commit link generation via `@changesets/get-github-info`
- [x] User attribution (Thanks @username!)
- [x] Issue reference extraction (closes/fixes/refs patterns)
- [x] Batched GitHub API calls (batch size 10)
- [x] Streaming mode for large repositories (>1000 changesets)
- [x] Graceful degradation on API failures with fallback formatting
- [x] Environment-aware logging (CI vs local)
- [x] Runtime validation of options, GitHub responses, and changeset data
- [x] Conventional commit type parsing (11 types)

---

## Related Documentation

**Internal Design Docs:**

- None yet (this is the first design doc for this module)

**Prior Art:**

- `workflow/pkgs/changelog/` - The existing `@savvy-web/changelog` package that this replaces
  - `src/index.ts` - Adapter pattern for Changesets API
  - `src/utils/format.ts` - Commit parsing, categorization, entry formatting
  - `src/utils/helper.ts` - Core getReleaseLine/getDependencyReleaseLine + getFormattedReleaseLines
  - `src/utils/validation.ts` - Valibot schemas (to be migrated to Effect Schema)
  - `__test__/changelog.test.ts` - 50+ formatter tests (reference for new test suite)
  - `__test__/validation.test.ts` - Schema validation tests (reference for new test suite)

**Package Documentation:**

- `CLAUDE.md` - Development guide and project conventions
- `README.md` - Package overview and usage (to be written)

**External Resources:**

- [Changesets documentation](https://github.com/changesets/changesets)
- [Changesets types source](https://github.com/changesets/changesets/tree/main/packages/types)
- [@changesets/get-github-info](https://github.com/changesets/changesets/tree/main/packages/get-github-info)
- [Unified/Remark documentation](https://unifiedjs.com/)
- [MDAST specification](https://github.com/syntax-tree/mdast)
- [unified-lint-rule](https://github.com/remarkjs/remark-lint/tree/main/packages/unified-lint-rule)
- [mdast-util-heading-range](https://github.com/syntax-tree/mdast-util-heading-range)
- [Effect CLI documentation](https://effect.website/docs/cli)
- [Effect Schema documentation](https://effect.website/docs/schema)

---

**Document Status:** Draft - Architecture design based on research, Silk Suite patterns, and prior
art analysis of `@savvy-web/changelog`

**Implementation Notes:**

- Repository is in template state; no implementation exists yet
- Package name must be changed from `@savvy-web/pnpm-module-template` to `@savvy-web/changesets`
- All three layers share the category system as their common data model
- The three-layer architecture directly addresses the Changesets API limitation of line-level-only
  formatting hooks
- Post-transformation is the key innovation: it compensates for the lack of an aggregate hook by
  operating on the full CHANGELOG.md after Changesets generates it
- Effect CLI and static class patterns are consistent with `@savvy-web/lint-staged`
- Prior art at `workflow/pkgs/changelog/` provides proven patterns for GitHub API integration,
  batched API calls, streaming mode, graceful degradation, and runtime validation
- Valibot schemas from prior art must be migrated to Effect Schema during implementation
- Prior art's `getFormattedReleaseLines()` aggregate function should be decomposed: per-changeset
  logic stays in Layer 2, cross-changeset merging moves to Layer 3
- Prior art's test suite (50+ tests) provides a reference for expected behavior and edge cases

**Maintenance:**

- Update this document when implementing each layer
- Keep the category table in sync with `src/categories/index.ts`
- Update the "Current State" section as implementation progresses
- Update completeness score to reflect actual documentation coverage
- Cross-reference prior art tests when writing new test cases
