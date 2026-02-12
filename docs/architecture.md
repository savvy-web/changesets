# Architecture

This document explains the three-layer processing
architecture of `@savvy-web/changesets` and how each
layer fits into the Changesets workflow.

## Why Three Layers?

The Changesets API provides only a line-level formatting
hook: `getReleaseLine` is called once per changeset and
must return a markdown string. There is no aggregate-level
hook for restructuring the assembled CHANGELOG output.

This constraint means a single formatter cannot:

- Merge duplicate section headings from multiple changesets
- Reorder sections by priority across changesets
- Deduplicate list items that appear in several changesets
- Validate changeset file structure before formatting

The three-layer architecture solves each of these
limitations with a dedicated processing stage.

## Processing Pipeline

```text
1. WRITE PHASE
   Developer or AI agent creates .changeset/*.md
         |
         v
   Layer 1: remark-lint validates structure
         |
         v
   Valid changeset file (or error reported)

2. VERSION PHASE
   changeset version
         |
         v
   Layer 2: getReleaseLine (per changeset)
         |  - Parse sections from summary
         |  - Format with GitHub attribution
         v
   Raw CHANGELOG.md

3. TRANSFORM PHASE
   savvy-changeset version (or savvy-changeset transform)
         |
         v
   Layer 3: remark transform pipeline
         |  - Merge duplicate sections
         |  - Reorder by priority
         |  - Deduplicate list items
         |  - Aggregate contributor footnotes
         |  - Consolidate issue link refs
         |  - Normalize formatting
         v
   Final CHANGELOG.md

4. FORMAT PHASE
   biome format --write .
         |
         v
   Production-ready CHANGELOG.md
```

## Layer 1: Pre-Validation (remark-lint)

**Entry point:** `@savvy-web/changesets/remark`

**When it runs:** CI, pre-commit hooks, CLI
(`savvy-changeset lint`)

Validates changeset `.md` files before they enter the
formatting pipeline. Three remark-lint rules enforce
structural correctness:

| Rule | Purpose |
| :--- | :--- |
| `heading-hierarchy` | h2 start, no h1, no depth skips |
| `required-sections` | Headings match known categories |
| `content-structure` | Non-empty sections, valid content |

By catching malformed changesets early, Layer 1 ensures
Layer 2 always receives well-structured input.

## Layer 2: Changelog Formatter (Changesets API)

**Entry point:** `@savvy-web/changesets/changelog`

**When it runs:** `changeset version` (configured in
`.changeset/config.json`)

Implements the Changesets `ChangelogFunctions` interface:

- `getReleaseLine` -- Parses section headings from the
  changeset summary, fetches GitHub PR/commit info, and
  returns formatted markdown with `### Category` headings
- `getDependencyReleaseLine` -- Formats dependency
  version updates into a collapsible details block

Each changeset produces its own formatted output. Because
Changesets assembles these outputs sequentially, duplicate
section headings may appear when multiple changesets
contribute to the same category.

## Layer 3: Post-Transformation (remark-transform)

**Entry point:** `@savvy-web/changesets/remark`

**When it runs:** After `changeset version`, via
`savvy-changeset transform` or CI scripts

Six remark plugins run in order to clean up the assembled
CHANGELOG:

| Plugin | Purpose |
| :--- | :--- |
| `merge-sections` | Combine duplicate h3 headings |
| `reorder-sections` | Sort by category priority |
| `deduplicate-items` | Remove duplicate list items |
| `contributor-footnotes` | Aggregate attributions |
| `issue-link-refs` | Consolidate reference-style links |
| `normalize-format` | Remove empty sections, clean up |

## Shared Category System

All three layers share a single category definition with
13 categories ordered by priority. See
[changeset-format.md](./changeset-format.md) for the
full category table.

The category system maps conventional commit types to
section headings (e.g., `feat` maps to "Features") and
defines the display order in the final CHANGELOG.

## CI Integration

The `ci:version` script uses the `version` command:

```bash
savvy-changeset version && biome format --write .
```

The `version` command detects the package manager,
runs `changeset version` (Layer 2), discovers all
workspace CHANGELOG.md files, and runs Layer 3
transform on each. Biome then normalizes formatting.

## Export Map

| Export Path | Purpose |
| :--- | :--- |
| `.` | Main library (classes + Effect) |
| `./changelog` | Changesets API formatter |
| `./markdownlint` | markdownlint custom rules for editor/CI |
| `./remark` | Lint rules + transform plugins |
