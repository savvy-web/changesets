# Dependency Table Format

## Overview

Replace the current bullet-list format for dependency entries in changesets and
changelogs with a structured markdown table. Tables appear at both ends of the
pipeline: authors (or automation) write dependency tables in changeset files, and
the remark transform produces aggregated tables in the final CHANGELOG.

### Goals

- Provide a structured, machine-parseable format for dependency changes
- Enable AI tooling and GitHub Actions to write and read dependency entries
  programmatically
- Aggregate multiple dependency changesets into a single consolidated table per
  release version
- Track dependency additions, updates, and removals with type metadata
- Give downstream automation (automerge decisions) clear signals via the
  `action` column

### Non-Goals

- Retroactively converting existing CHANGELOG bullet-list entries to tables
- Commit link attribution in the dependency table
- Tracking transitive dependency changes

## Data Model

### Schema

The canonical representation is a `DependencyTableRow` Effect Schema in
`src/schemas/`. These are named `DependencyTableTypeSchema` and
`DependencyTableRowSchema` to avoid collision with the existing
`DependencyTypeSchema` (which uses plural npm field names like
`"dependencies"`):

```typescript
const DependencyAction = Schema.Literal("added", "updated", "removed")

const DependencyType = Schema.Literal(
  "dependency",
  "devDependency",
  "peerDependency",
  "optionalDependency",
  "workspace",
  "config",
)

// U+2014 em dash (—) as sentinel for added/removed
const VersionOrEmpty = Schema.String.pipe(
  Schema.pattern(/^(\u2014|[~^]?\d+\.\d+\.\d+[\w.+-]*)$/)
)

const DependencyTableRowSchema = Schema.Struct({
  dependency: Schema.NonEmptyString,
  type: DependencyType,
  action: DependencyAction,
  from: VersionOrEmpty,
  to: VersionOrEmpty,
})

const DependencyTableSchema = Schema.Array(DependencyTableRowSchema).pipe(
  Schema.minItems(1),
)
```

### Type Vocabulary

| Type | Meaning |
| --- | --- |
| `dependency` | Production `dependencies` |
| `devDependency` | `devDependencies` |
| `peerDependency` | `peerDependencies` |
| `optionalDependency` | `optionalDependencies` |
| `workspace` | Toolchain: `packageManager`, `devEngines.packageManager`, `devEngines.runtimes[]` |
| `config` | pnpm plugin configs in `package.json` |

### Action Vocabulary

| Action | `from` | `to` |
| --- | --- | --- |
| `added` | `—` | version |
| `updated` | version | version |
| `removed` | version | `—` |

### Markdown Table Format

Both input (changeset files) and output (CHANGELOG) use the same table
structure and columns. The heading level differs by context:

- **Changeset files** (input): `## Dependencies` (h2) — changeset files use h2
  as the top-level section heading, enforced by the `heading-hierarchy` lint rule
- **CHANGELOG output**: `### Dependencies` (h3) — version blocks are h2
  (`## 1.2.0`), so category sections nest as h3

This follows the existing convention for all category sections.

**Changeset input example:**

```markdown
## Dependencies

| Dependency | Type | Action | From | To |
| --- | --- | --- | --- | --- |
| typescript | devDependency | updated | ^5.4.0 | ^5.6.0 |
| new-pkg | dependency | added | — | ^1.0.0 |
| old-pkg | dependency | removed | ^2.0.0 | — |
| node | workspace | updated | 22.0.0 | 24.0.0 |
| @my-org/pnpm-plugin-foo | config | updated | 1.0.0 | 2.0.0 |
```

Column headers are case-insensitive during parsing, emitted as title-case in
output.

## Layer 1: Remark-Lint Validation

A new remark-lint rule `dependency-table-format` in `src/remark/rules/`.

### Validation Rules

1. `## Dependencies` section must contain exactly one table node (no lists, no
   prose)
2. Table header must have exactly 5 columns: `Dependency | Type | Action | From
   | To` (case-insensitive)
3. Columns must appear in canonical order
4. Row-level validation:
   - `dependency` must be non-empty
   - `type` must be a valid `DependencyType` literal
   - `action` must be a valid `DependencyAction` literal
   - `from` must be `—` when action is `added`, a version string otherwise
   - `to` must be `—` when action is `removed`, a version string otherwise
5. Table must have at least one data row

### Scope

This rule only fires on `## Dependencies` sections. Other category sections are
unaffected. The existing `content-structure` rule does not currently reject
tables, so no update is needed — tables pass through its checks without
triggering violations.

### Error Messages

Errors are specific and actionable:

- `"Dependencies section must contain a table, not a list"`
- `"Unknown dependency type 'devDep' — expected one of: dependency,
  devDependency, peerDependency, optionalDependency, workspace, config"`
- `"'from' must be '—' when action is 'added'"`
- `"Table must have columns: Dependency, Type, Action, From, To"`

## Layer 2: Changelog Formatter

### `getDependencyReleaseLine` Update

Updated to emit a markdown table string instead of a bullet list:

- Map each `ModCompWithPackage` to a `DependencyTableRow`:
  - `dependency` = `name`
  - `type` = inferred by looking up `name` in the consuming package's
    `packageJson.dependencies`, `packageJson.devDependencies`,
    `packageJson.peerDependencies`, and `packageJson.optionalDependencies`
    fields. Falls back to `"dependency"` if not found in any field. Note:
    `workspace` and `config` types are never produced by the Changesets API —
    those only come from manually-written or automation-generated changesets.
  - `action` = `"updated"` (Changesets API only tracks version bumps of existing
    deps, not additions or removals)
  - `from` = `oldVersion`
  - `to` = `newVersion`
- Serialize rows to a markdown table string via the shared utility
- No commit links in the table

### `getReleaseLine` Passthrough

When a changeset's `## Dependencies` section already contains a table (written
by AI/automation), `getReleaseLine` passes it through as-is. The section parser
extracts the content and the table markdown flows into changelog output
unmodified. The transform layer handles merging.

### Constraint

The Changesets API expects string return values from both functions. Markdown
table strings satisfy this. When the full CHANGELOG is re-parsed by the remark
transform pipeline, the tables become proper MDAST table nodes.

## Layer 3: Remark Transform (Aggregation)

A new remark plugin `aggregate-dependency-tables` in `src/remark/plugins/`.

### Pipeline Position

Inserted at index 0 of `SilkChangesetTransformPreset`, before
`MergeSectionsPlugin`. It must run first since it consolidates all
`### Dependencies` sections within a version block into one, preventing
`MergeSectionsPlugin` from merging them as generic duplicate headings.

### Algorithm

1. Find all `### Dependencies` sections within each `## [version]` block
2. Extract table nodes (requires `remark-gfm` for MDAST table node parsing —
   already a project dependency), parse rows into `DependencyTableRow[]` via the
   schema
3. Handle mixed content: if legacy bullet-list items exist under
   `### Dependencies`, leave them as-is below the table
4. Collapse rows with the same `dependency` + `type` (see Collapse Rules)
5. Sort the final table (see Sort Order)
6. Rebuild a single table node and replace all individual `### Dependencies`
   sections with one consolidated section

### Collapse Rules

When multiple rows share the same `dependency` + `type`:

| First Action | Second Action | Result |
| --- | --- | --- |
| `updated` | `updated` | `updated` with earliest `from`, latest `to` |
| `added` | `updated` | `added` with final `to` |
| `added` | `removed` | Drop entirely (net zero) |
| `updated` | `removed` | `removed` with original `from` |
| `removed` | `added` | `updated` with original `from`, new `to` (re-added) |
| same action | same action | Validation error — duplicate entries |
| `removed` | `updated` | Validation error — contradictory sequence |
| `updated` | `added` | Validation error — contradictory sequence |

Contradictory or duplicate combinations indicate malformed changeset input.
The aggregation plugin emits a warning and keeps the later entry.

### Sort Order

1. Primary: `action` — `removed`, `updated`, `added` (most impactful first)
2. Secondary: `type` alphabetically
3. Tertiary: `dependency` name alphabetically

### Edge Cases

- Single changeset: table passes through unchanged (still sorted)
- All rows collapse to nothing (added then removed): `### Dependencies` section
  dropped by existing `normalize-format` plugin

## Utilities & Programmatic API

Shared utility module `src/utils/dependency-table.ts` used by all three layers.

### Functions

- `parseDependencyTable(tableNode: MdastTable): DependencyTableRow[]` — Parse
  and validate an MDAST table node against the schema
- `serializeDependencyTable(rows: DependencyTableRow[]): MdastTable` — Build an
  MDAST table node from typed rows
- `serializeDependencyTableToMarkdown(rows: DependencyTableRow[]): string` —
  Render to markdown string (for formatter string return constraint)
- `collapseDependencyRows(rows: DependencyTableRow[]): DependencyTableRow[]` —
  Collapse same-package entries per the rules above
- `sortDependencyRows(rows: DependencyTableRow[]): DependencyTableRow[]` — Sort
  per the ordering above

### Class-Based Wrapper

```typescript
class DependencyTable {
  static parse(tableNode: MdastTable): DependencyTableRow[]
  static serialize(rows: DependencyTableRow[]): MdastTable
  static toMarkdown(rows: DependencyTableRow[]): string
  static collapse(rows: DependencyTableRow[]): DependencyTableRow[]
  static sort(rows: DependencyTableRow[]): DependencyTableRow[]
  static aggregate(rows: DependencyTableRow[]): DependencyTableRow[]  // collapse + sort
}
```

### Export

Added to the main `"."` export path as a general-purpose utility for
programmatic access by AI tooling and GitHub Actions.

## Testing Strategy

### Unit Tests

- `src/schemas/dependency-table.test.ts` — Schema validation: valid rows,
  invalid types/actions, version pattern matching, `—` enforcement for
  added/removed, scoped packages, pre-release versions
- `src/utils/dependency-table.test.ts` — Parse/serialize round-trips, collapse
  logic (all combination pairs), sort ordering, empty input
- `src/remark/rules/dependency-table-format.test.ts` — Lint rule: valid tables
  pass, missing/wrong columns, invalid values, non-table content under
  `## Dependencies`

### Integration Tests

- `src/changelog/getDependencyReleaseLine.test.ts` — Table output format,
  `ModCompWithPackage` mapping to correct action/type
- `src/remark/plugins/aggregate-dependency-tables.test.ts` — Multi-section
  aggregation, collapse across changesets, legacy bullet-list passthrough,
  single-table passthrough, empty-after-collapse removal
- Pipeline round-trip in `src/__tests__/` — Changeset with dependency table
  through lint, formatter, transform to final CHANGELOG with one clean table
- `src/cli/commands/init.test.ts` — Verify new rule is registered in base
  config, changeset-scoped config, and `--check` mode detects missing rule
- `src/__test__/exports.test.ts` — Update `SilkChangesetTransformPreset` length
  assertion from 6 to 7

### Coverage

Existing 85% line/branch/statement and 80% function thresholds apply. Collapse
logic requires exhaustive combinatorial coverage.

## CLI Init & Config Registration

The `init` CLI command (`src/cli/commands/init.ts`) bootstraps repositories for
changesets. It must be updated to register the new rule.

### markdownlint Rule

A new markdownlint rule `changeset-dependency-table-format` (code `CSH005`) in
`src/markdownlint/rules/`. This mirrors the remark-lint rule but runs in
markdownlint-cli2 and VS Code for editor feedback.

Registration points:

1. **`src/markdownlint/index.ts`** — Add `DependencyTableFormatRule` to the
   `SilkChangesetsRules` array
2. **`src/remark/presets.ts`** — Add `DependencyTableFormatRule` to
   `SilkChangesetPreset`
3. **`src/remark/index.ts`** — Export the new remark rule

### Init Command Updates

The init command's config registration functions must include the new rule:

1. **`handleBaseMarkdownlint()`** — Add
   `"changeset-dependency-table-format": false` to the base config's `config`
   section (disabled globally, like the existing four rules)
2. **`handleChangesetMarkdownlint()`** — Add
   `"changeset-dependency-table-format": true` to the changeset-scoped
   `.changeset/.markdownlint.json` (enabled for changeset files)
3. **`--check` mode** — The `checkBaseMarkdownlint()` and
   `checkChangesetMarkdownlint()` diagnostic functions must verify the new rule
   is registered

### Config Files Affected

- `lib/configs/.markdownlint-cli2.jsonc` — Base config gets the new rule
  disabled
- `.changeset/.markdownlint.json` — Scoped config enables it

### Existing Config Upgrade

Repos already initialized with the old four-rule set will need to re-run
`init --force` (or manually add the new rule to their configs). The `--check`
mode will detect the missing rule and report it.

## Migration & Backward Compatibility

### Existing Changelogs

The `aggregate-dependency-tables` plugin leaves legacy bullet-list content
as-is below the table. Old CHANGELOG entries are not retroactively converted.
New releases get tables, old versions keep lists.

### Existing Changeset Files

The strict lint rule applies to new changesets going forward. In-flight
`.changeset/*.md` files with bullet-list `## Dependencies` sections need
conversion to table format. Since changesets are consumed and deleted on release,
this is a narrow window.

### Downstream Consumers

The `getDependencyReleaseLine` return value changes from bullet-list string to
table string. The Changesets API does not parse the string — it concatenates it.

### Rollout

1. Ship the feature with all three layers plus CLI init updates
2. Re-run `init --force` on consuming repos to register the new rule
3. Convert any in-flight dependency changesets to table format
4. Update `pnpm-config-dependency-action` to emit table format
