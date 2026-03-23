---
name: format
user-invocable: false
description: >
  Use when writing, editing, or reviewing changeset files in .changeset/.
  Provides the @savvy-web/changesets format specification including valid
  section headings, structural rules, and content quality guidance. Activates
  when working with changeset markdown files, creating changesets, or
  discussing changeset format.
---

# Changeset Format Reference

## YAML Frontmatter

Every changeset file begins with YAML frontmatter declaring which packages are affected and the bump level:

```yaml
---
"@savvy-web/package-name": patch | minor | major
---
```

Multiple packages can be listed when a change affects several packages.

## Valid Section Headings

All `##` headings in a changeset must match one of these 13 categories, listed in render priority order:

| Priority | Heading | Commit Types | Use For |
| :--- | :--- | :--- | :--- |
| 1 | Breaking Changes | any `!` suffix | Backward-incompatible changes |
| 2 | Features | `feat` | New functionality |
| 3 | Bug Fixes | `fix` | Bug corrections |
| 4 | Performance | `perf` | Performance improvements |
| 5 | Documentation | `docs` | Documentation changes |
| 6 | Refactoring | `refactor` | Code restructuring |
| 7 | Tests | `test` | Test additions or modifications |
| 8 | Build System | `build` | Build configuration changes |
| 9 | CI | `ci` | Continuous integration changes |
| 10 | Dependencies | `deps` | Dependency updates |
| 11 | Maintenance | `chore`, `style` | General maintenance |
| 12 | Reverts | `revert` | Reverted changes |
| 13 | Other | unrecognized | Uncategorized changes |

## Structural Rules

| Rule Code | Rule |
| :--- | :--- |
| CSH001 | No h1 headings; no heading depth skips (e.g., `##` to `####`) |
| CSH002 | All h2 headings must match a known category from the table above |
| CSH003 | No empty sections; code fences must have a language identifier; no empty list items |
| CSH004 | No content before the first h2 heading |
| CSH005 | Dependency tables must follow the 5-column schema (`Dependency \| Type \| Action \| From \| To`) |

## Content Depth Tiers

Choose a tier based on the significance of the change:

| Tier | When | Content |
| :--- | :--- | :--- |
| Simple | Small fixes, internal tweaks | `## Category` + bullet points |
| Structured | Multi-faceted changes | Multiple `## Category` sections, `### Sub-heading` for distinct sub-features |
| Rich | Significant features, breaking changes | Narrative paragraphs, `### Named Sub-features`, code blocks with usage examples, migration guides |

## Key Principle

Changesets are release documentation for GitHub releases, not an engineering log. Focus on what someone upgrading the package needs to know.

## Examples

### Simple Tier

```markdown
---
"@savvy-web/changelog": patch
---

## Bug Fixes

Corrects Markdown link syntax for PR references. Changes `[(#42)](url)` to `[#42](url)` so PR numbers display as clickable links without extra bracket characters.

* Corrects `formatPRAndUserAttribution()` to use proper Markdown link syntax
* Exports `formatPRAndUserAttribution` to make it testable and reusable
```

### Structured Tier

```markdown
---
"@savvy-web/rslib-builder": minor
---

## Features

* `RSPressPluginBuilder.create()` — zero-config builder for RSPress plugins with plugin + optional runtime bundles
* Runtime auto-detection from `src/runtime/index.tsx`
* `tsconfigPreset` option on DtsPlugin for custom tsconfig preset selection

## Bug Fixes

* BannerPlugin CSS injection scoped to JS files via `include: /index\.js$/`
* Runtime DTS no longer cross-contaminates with plugin DTS in dual-lib builds
```

### Rich Tier

```markdown
---
"@savvy-web/shared": minor
---

## Features

### Hybrid Transformation Pipeline

Replaces custom dependency resolution with `@pnpm/exportable-manifest` while maintaining RSLib-specific transformations.

**Architecture:**

* Stage 1: Apply pnpm transformations (resolve catalog: and workspace: references)
* Stage 2: Apply RSLib transformations (path updates, field cleanup, type generation)
* Development mode: Preserves catalog: and workspace: references for local development
* Production mode: Complete transformation for npm/jsr publishing

## Breaking Changes

* Removed unused `transformer` option from `PackageJsonTransformPlugin`
* Plugin API remains backward compatible for existing usage
```
