# @savvy-web/changesets

## 0.1.2

### Dependencies

* [`29ad4d0`](https://github.com/savvy-web/changesets/commit/29ad4d0fe929267caca0220375806d5912b44ab5) @savvy-web/commitlint: ^0.3.2 → ^0.3.3
* @savvy-web/lint-staged: ^0.4.0 → ^0.4.2
* @savvy-web/rslib-builder: ^0.14.1 → ^0.14.2

## 0.1.1

### Features

* [`50ebcc6`](https://github.com/savvy-web/changesets/commit/50ebcc678fa2c77696f857338bc24cf03acc4b67) Add `--check` flag to `init` command for read-only config inspection, suitable for postinstall scripts (always exits 0, logs warnings for out-of-date config)
* Search for markdownlint config in multiple locations: `lib/configs/.markdownlint-cli2.jsonc`, `lib/configs/.markdownlint-cli2.json`, `.markdownlint-cli2.jsonc`, `.markdownlint-cli2.json` (first match wins)
* Warn when no markdownlint config file is found instead of silently skipping
* Dual-format (ESM + CJS) build exports

### Bug Fixes

* [`50ebcc6`](https://github.com/savvy-web/changesets/commit/50ebcc678fa2c77696f857338bc24cf03acc4b67) Fix markdownlint exports to match markdownlint-cli2 expectations
* Manage `customRules` property in markdownlint-cli2 config file during init

## 0.1.0

### Features

* [`3709f16`](https://github.com/savvy-web/changesets/commit/3709f16019575a388d0ff2dfc4e646c94b8ef4c3) Three-layer changelog processing pipeline that overcomes the
  Changesets API line-level formatting limitation: pre-validation
  (remark-lint), changelog formatting (Changesets API), and
  post-processing (remark-transform)
* Section-aware changeset files using h2 headings to categorize
  changes within a single changeset (Features, Bug Fixes,
  Breaking Changes, etc.)
* 13 priority-ordered section categories with automatic
  conventional commit type mapping, breaking change detection
  via `!` suffix, and `chore(deps)` routing to Dependencies
* Changelog formatter (`@savvy-web/changesets/changelog`) that
  produces GitHub-linked entries with commit references, PR
  links, contributor attribution, and issue reference extraction
* Six remark transform plugins (merge-sections,
  reorder-sections, deduplicate-items, contributor-footnotes,
  issue-link-refs, normalize-format) that post-process raw
  CHANGELOG.md output into clean, consistently ordered markdown
* Three remark-lint rules (heading-hierarchy, required-sections,
  content-structure) for validating changeset file structure
  before formatting
* `savvy-changesets` CLI with lint, check, and transform
  subcommands built on @effect/cli for CI and local validation
  workflows
* Dual API surface: Effect service primitives for advanced
  composition and static class wrappers (`ChangelogTransformer`,
  `ChangesetLinter`, `Categories`) for straightforward usage
* Effect Schema validation at all system boundaries with
  four tagged error types (`ChangesetValidationError`,
  `GitHubApiError`, `MarkdownParseError`, `ConfigurationError`)
* GitHub API integration with graceful degradation, batch
  processing, and fallback link generation on API failures
* Output compatible with workflow-release-action's version
  section extraction and GitHub-flavored markdown rendering

### Documentation

* [`3709f16`](https://github.com/savvy-web/changesets/commit/3709f16019575a388d0ff2dfc4e646c94b8ef4c3) Comprehensive README with installation, quick start,
  CLI reference, and programmatic API examples
* Repository docs covering architecture, configuration,
  changeset file format, CLI usage, and full API reference

### Tests

* [`3709f16`](https://github.com/savvy-web/changesets/commit/3709f16019575a388d0ff2dfc4e646c94b8ef4c3) 360 tests across 37 test files covering all three processing
  layers, CLI commands, Effect services, schemas, and utilities
* Cross-layer integration tests exercising the full pipeline
  from changeset input through formatter and transformer to
  final CHANGELOG output
* workflow-release-action compatibility tests verifying output
  parseability
* Round-trip validation tests confirming transformer idempotency
  and category heading consistency
* Coverage thresholds enforced at 85% lines/branches/statements
  and 80% functions
