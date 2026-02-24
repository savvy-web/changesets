# Architecture

This document explains the three-layer processing architecture of `@savvy-web/changesets` and how each layer fits into the Changesets workflow.

## Why Three Layers?

The Changesets API provides only a line-level formatting hook: `getReleaseLine` is called once per changeset and must return a markdown string. There is no aggregate-level hook for restructuring the assembled CHANGELOG output.

This constraint means a single formatter cannot:

- Merge duplicate section headings from multiple changesets
- Reorder sections by priority across changesets
- Deduplicate list items that appear in several changesets
- Validate changeset file structure before formatting

The three-layer architecture solves each of these limitations with a dedicated processing stage.

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
   savvy-changesets version (or savvy-changesets transform)
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
         |
         v
   Version files: update additional JSON files
         |  - Resolve glob patterns
         |  - Match nearest workspace version
         |  - Set JSONPath fields
         v
   Updated version files (if configured)

4. FORMAT PHASE
   biome format --write .
         |
         v
   Production-ready CHANGELOG.md
```

## Layer 1: Pre-Validation (remark-lint)

**Entry point:** `@savvy-web/changesets/remark`

**When it runs:** CI, pre-commit hooks, CLI (`savvy-changesets lint`)

Validates changeset `.md` files before they enter the formatting pipeline. Three remark-lint rules enforce structural correctness:

| Rule | Purpose |
| :--- | :--- |
| `heading-hierarchy` | h2 start, no h1, no depth skips |
| `required-sections` | Headings match known categories |
| `content-structure` | Non-empty sections, valid content |

By catching malformed changesets early, Layer 1 ensures Layer 2 always receives well-structured input.

## Layer 2: Changelog Formatter (Changesets API)

**Entry point:** `@savvy-web/changesets/changelog`

**When it runs:** `changeset version` (configured in `.changeset/config.json`)

Implements the Changesets `ChangelogFunctions` interface:

- `getReleaseLine` -- Parses section headings from the changeset summary, fetches GitHub PR/commit info, and returns formatted markdown with `### Category` headings
- `getDependencyReleaseLine` -- Formats dependency version updates into a collapsible details block

Each changeset produces its own formatted output. Because Changesets assembles these outputs sequentially, duplicate section headings may appear when multiple changesets contribute to the same category.

## Layer 3: Post-Transformation (remark-transform)

**Entry point:** `@savvy-web/changesets/remark`

**When it runs:** After `changeset version`, via `savvy-changesets transform` or CI scripts

Six remark plugins run in order to clean up the assembled CHANGELOG:

| Plugin | Purpose |
| :--- | :--- |
| `merge-sections` | Combine duplicate h3 headings |
| `reorder-sections` | Sort by category priority |
| `deduplicate-items` | Remove duplicate list items |
| `contributor-footnotes` | Aggregate attributions |
| `issue-link-refs` | Consolidate reference-style links |
| `normalize-format` | Remove empty sections, clean up |

## Shared Category System

All three layers share a single category definition with 13 categories ordered by priority. See [changeset-format.md](./changeset-format.md) for the full category table.

The category system maps conventional commit types to section headings (e.g., `feat` maps to "Features") and defines the display order in the final CHANGELOG.

## Version Files

After the three-layer pipeline produces the final CHANGELOG, an optional step updates version fields in additional JSON files. This is driven by the `versionFiles` configuration in `.changeset/config.json` (see [Configuration: Version Files](./configuration.md#versionfiles-optional)).

The version files subsystem consists of three internal components:

| Component | Source | Purpose |
| :--- | :--- | :--- |
| `VersionFilesSchema` | `src/schemas/version-files.ts` | Effect Schema for config validation (`glob` + `paths`) |
| `jsonpath` utilities | `src/utils/jsonpath.ts` | Minimal JSONPath parser supporting `$.foo.bar`, `[*]`, and `[n]` |
| `VersionFiles` class | `src/utils/version-files.ts` | Orchestrates glob resolution, workspace version matching, and file updates |

The flow is:

1. **Read config** -- Parse `versionFiles` from the changelog options in `.changeset/config.json`
2. **Resolve globs** -- Expand each glob pattern against the project root (excluding `node_modules`)
3. **Match versions** -- For each matched file, determine the correct version using longest-prefix workspace path matching
4. **Update fields** -- Parse each JSON file, set values at the specified JSONPath locations, and write back with preserved formatting

This step adds zero new runtime dependencies. The JSONPath implementation is a custom minimal parser (~200 lines) that supports only the subset of JSONPath syntax needed for version field access. The `VersionFileError` tagged error is raised if a file cannot be read, parsed, or updated.

## CI Integration

The `ci:version` script uses the `version` command:

```bash
savvy-changesets version && biome format --write .
```

The `version` command detects the package manager, runs `changeset version` (Layer 2), discovers all workspace CHANGELOG.md files, runs Layer 3 transform on each, and then updates any configured version files. Biome then normalizes formatting.

## Export Map

| Export Path | Purpose |
| :--- | :--- |
| `.` | Main library (classes + Effect) |
| `./changelog` | Changesets API formatter |
| `./markdownlint` | markdownlint custom rules for editor/CI |
| `./remark` | Lint rules + transform plugins |
