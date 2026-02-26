# Changeset File Format

This document describes how to write changeset files for `@savvy-web/changesets`. The formatter supports both flat text (standard Changesets format) and section-aware format with h2 headings for categorized output.

## Basic Structure

Every changeset file lives in `.changeset/` and has YAML frontmatter followed by markdown content:

```markdown
---
"@my/package": minor
---

Your change description here.
```

The frontmatter maps package names to bump types (`major`, `minor`, or `patch`). The content after the frontmatter is the changeset summary.

## Flat Text Format (Backward Compatible)

Plain text without section headings works the same as standard Changesets:

```markdown
---
"@my/package": patch
---

Fixed a bug where the parser would crash on empty input.
```

This produces a single list item in the CHANGELOG under the version heading, with no category grouping.

## Section-Aware Format

Use h2 headings to categorize changes within a single changeset. This is the recommended format:

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

Each h2 heading becomes a `### Category` section in the generated CHANGELOG. Multiple categories per changeset are encouraged when a single PR touches features, tests, and documentation together.

### Sub-Headings

Use h3 headings within a section for finer-grained organization:

```markdown
---
"@my/package": minor
---

## Features

### Fluent API

Added a fluent builder API for configuration.

### Plugin System

Added support for custom plugins.
```

## Section Categories

The following 13 categories are recognized. Headings are matched case-insensitively.

| Priority | Heading | Commit Types | Description |
| :--- | :--- | :--- | :--- |
| 1 | Breaking Changes | (breaking flag) | Backward-incompatible |
| 2 | Features | `feat` | New functionality |
| 3 | Bug Fixes | `fix` | Bug corrections |
| 4 | Performance | `perf` | Improvements |
| 5 | Documentation | `docs` | Doc changes |
| 6 | Refactoring | `refactor` | Code restructuring |
| 7 | Tests | `test` | Test changes |
| 8 | Build System | `build` | Build config |
| 9 | CI | `ci` | CI changes |
| 10 | Dependencies | `deps` | Dep updates |
| 11 | Maintenance | `chore`, `style` | General upkeep |
| 12 | Reverts | `revert` | Reverted changes |
| 13 | Other | (none) | Uncategorized |

Priority determines display order in the CHANGELOG. Breaking Changes always appear first; Other always appears last.

The special scope `chore(deps)` maps to Dependencies rather than Maintenance.

## Format Rules

1. **YAML frontmatter** uses standard Changesets format (package name to bump type mapping)
2. **Section headings** (h2) must match a known category from the table above
3. **Sub-headings** (h3) are optional for finer-grained organization within a section
4. **Content** under sections can include paragraphs, lists, code blocks, and inline formatting
5. **Multiple sections** per changeset are encouraged
6. **Empty sections** are not allowed -- every heading must have content beneath it

## Validation

The remark-lint rules (Layer 1) enforce these structural requirements:

- **heading-hierarchy** -- Must start with h2, no h1 allowed, no depth skips (e.g., h2 to h4)
- **required-sections** -- All h2 headings must match a known category name
- **content-structure** -- Every section must contain non-empty content
- **uncategorized-content** -- All content must appear under a category heading (no loose text before the first h2)

Run validation with the CLI:

```bash
# Machine-readable output
savvy-changesets lint .changeset

# Human-readable summary
savvy-changesets check .changeset
```

Or programmatically:

```typescript
import { ChangesetLinter } from "@savvy-web/changesets";

const messages = ChangesetLinter.validate(".changeset");
for (const msg of messages) {
  console.log(
    `${msg.file}:${msg.line}:${msg.column}`,
    msg.rule,
    msg.message,
  );
}
```

## Examples

### Single-Category Changeset

```markdown
---
"@savvy-web/changesets": patch
---

## Bug Fixes

Fixed section merging when headings have trailing whitespace.
```

### Multi-Category Changeset

```markdown
---
"@savvy-web/changesets": minor
---

## Features

### Structured Changelog Sections

Added section-aware changelog formatting. Changeset files now use h2 headings to categorize changes.

### Post-Processing Pipeline

After `changeset version` generates the raw CHANGELOG, a remark transform pipeline merges duplicate sections, reorders by priority, and deduplicates list items.

## Documentation

- Added architecture design document
- Updated CLAUDE.md with design doc pointers

## Tests

- Unit tests for getReleaseLine with section parsing
- Integration tests for the full pipeline
```

### Breaking Change

```markdown
---
"@savvy-web/changesets": major
---

## Breaking Changes

Removed the deprecated `format()` method. Use `ChangelogTransformer.transformContent()` instead.

## Features

Added the new `ChangelogTransformer` class with `transformContent` and `transformFile` static methods.
```
