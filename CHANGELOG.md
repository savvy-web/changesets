# @savvy-web/changesets

## 0.5.4

### Dependencies

* | [`2edd92a`](https://github.com/savvy-web/changesets/commit/2edd92a4f5912288195a48f0689bf6bf8ec40e5b) | Dependency | Type    | Action  | From    | To |
  | :--------------------------------------------------------------------------------------------------- | :--------- | :------ | :------ | :------ | -- |
  | @savvy-web/commitlint                                                                                | dependency | updated | ^0.4.2  | ^0.4.3  |    |
  | @savvy-web/lint-staged                                                                               | dependency | updated | ^0.6.1  | ^0.6.2  |    |
  | @savvy-web/rslib-builder                                                                             | dependency | updated | ^0.18.2 | ^0.19.0 |    |
  | @savvy-web/vitest                                                                                    | dependency | updated | ^0.2.1  | ^0.3.0  |    |

## 0.5.3

### Other

* [`742f822`](https://github.com/savvy-web/changesets/commit/742f8228942cdf28ee5086bdf4001c6b8453c75c) Switch to pnpm-plugin-silk to manage Effect dependencies

## 0.5.2

### Dependencies

* | [`4c4f9a6`](https://github.com/savvy-web/changesets/commit/4c4f9a676aae8fa19b6d66915fd995d26de48caa) | Dependency | Type    | Action  | From    | To |
  | :--------------------------------------------------------------------------------------------------- | :--------- | :------ | :------ | :------ | -- |
  | @savvy-web/commitlint                                                                                | dependency | updated | ^0.4.0  | ^0.4.1  |    |
  | @savvy-web/lint-staged                                                                               | dependency | updated | ^0.5.0  | ^0.6.0  |    |
  | @savvy-web/rslib-builder                                                                             | dependency | updated | ^0.16.0 | ^0.18.2 |    |
  | @savvy-web/vitest                                                                                    | dependency | updated | ^0.2.0  | ^0.2.1  |    |

## 0.5.1

### Bug Fixes

* [`218b61b`](https://github.com/savvy-web/changesets/commit/218b61b4edd67bcbd169e89581ca886967bfc281) Remove injected `postinstall` script from published package.json. Security scanners flag `postinstall` scripts in dependencies as a potential supply chain risk. Fixes #31.

## 0.5.0

### Features

* [`ae9fb5b`](https://github.com/savvy-web/changesets/commit/ae9fb5bd11d7856fc9cf97698b0f1f10a25b894e) Add structured dependency table format for changeset files and CHANGELOG output, replacing bullet-list entries with GFM tables (columns: Dependency, Type, Action, From, To)
* Add remark-lint rule CSH005 (`changeset-dependency-table-format`) to validate dependency table structure and semantics
* Add markdownlint rule CSH005 for editor and CI integration of dependency table validation
* Add `AggregateDependencyTablesPlugin` remark transform to collapse and sort dependency entries across multiple changesets into a single consolidated table per version block
* Add `DependencyTable` class-based API with parse, serialize, collapse, sort, and aggregate operations
* Add Effect schemas for dependency table validation: `DependencyActionSchema`, `DependencyTableTypeSchema`, `VersionOrEmptySchema`, `DependencyTableRowSchema`, `DependencyTableSchema`
* Rewrite `getDependencyReleaseLine` changelog formatter to emit markdown table format with automatic dependency type inference

### Documentation

* [`ae9fb5b`](https://github.com/savvy-web/changesets/commit/ae9fb5bd11d7856fc9cf97698b0f1f10a25b894e) Add comprehensive TSDoc documentation across all source files with `@public`/`@internal` modifiers, `@remarks` blocks, cross-references, and complete `@example` programs

### Dependencies

* | [`ae9fb5b`](https://github.com/savvy-web/changesets/commit/ae9fb5bd11d7856fc9cf97698b0f1f10a25b894e) | Dependency    | Type    | Action  | From    | To |
  | ---------------------------------------------------------------------------------------------------- | ------------- | ------- | ------- | ------- | -- |
  | @savvy-web/commitlint                                                                                | devDependency | updated | ^0.3.4  | ^0.4.0  |    |
  | @savvy-web/lint-staged                                                                               | devDependency | updated | ^0.4.6  | ^0.5.0  |    |
  | @savvy-web/rslib-builder                                                                             | devDependency | updated | ^0.15.0 | ^0.16.0 |    |
  | @savvy-web/vitest                                                                                    | devDependency | updated | ^0.1.0  | ^0.2.0  |    |

## 0.4.2

### Dependencies

* [`f414044`](https://github.com/savvy-web/changesets/commit/f41404458c2791d94482b3fd455d94f3c411c8ed) @savvy-web/commitlint: ^0.3.4 → ^0.4.0
* @savvy-web/lint-staged: ^0.4.6 → ^0.5.0
* @savvy-web/rslib-builder: ^0.15.0 → ^0.16.0
* @savvy-web/vitest: ^0.1.0 → ^0.2.0

## 0.4.1

### Bug Fixes

* [`2d11fba`](https://github.com/savvy-web/changesets/commit/2d11fbaebd37f09cdbc0564d2a93fb4f8f916ea4) Fixed `init` command never patching or checking the base markdownlint config because `Options.boolean("markdownlint").pipe(Options.withDefault(true))` is a no-op in @effect/cli (boolean options default to `false`, and `withDefault` cannot override this)
* Replaced `--markdownlint` (broken default-true) with `--skip-markdownlint` (correct default-false) so the base config is patched by default
* Removed misleading `withDefault(false)` from other boolean options since it's equally a no-op

## 0.4.0

### Features

* [`a0fac3a`](https://github.com/savvy-web/changesets/commit/a0fac3a19da8a97ff4e0600e956feb008bd71243) Added AI-agent-friendly error messages to all markdownlint and remark-lint rules with inline fix instructions and documentation URLs
* Created per-rule documentation files (CSH001-CSH004) following the DavidAnson/markdownlint pattern with valid/invalid examples, fix instructions, and rationale
* Improved schema validation messages with format examples and expected values

### Bug Fixes

* [`5482ee1`](https://github.com/savvy-web/changesets/commit/5482ee177c45927da4794b59be5057da94ff1c5e) Fixed `init` command destroying JSONC comments and formatting when patching markdownlint config files by switching from regex-based comment stripping + `JSON.stringify` to `jsonc-parser`'s `modify` + `applyEdits` for surgical edits

## 0.3.0

### Features

* [`eda764c`](https://github.com/savvy-web/changesets/commit/eda764c0469214112d336cc1307a78196fef1b04) Added `uncategorized-content` remark-lint rule and `CSH004` markdownlint rule that detect content appearing before the first `##` category heading in changeset files, ensuring all content is properly categorized

## 0.2.1

### Bug Fixes

* [`4eb8772`](https://github.com/savvy-web/changesets/commit/4eb8772580e5ebe26aa39fc99f607dcb78661aae) ### Replace Node 22+ fs.globSync with tinyglobby

The `versionFiles` feature used `fs.globSync` which is only available in Node 22+. Consumers running on Node 20 (LTS) hit a `SyntaxError` at import time. Replaced with `tinyglobby` for cross-version compatibility.

## 0.2.0

### Minor Changes

* [`f05af72`](https://github.com/savvy-web/changesets/commit/f05af72f77481dd8bec28a368e9ed70c92e992f1) Add `versionFiles` option to bump version fields in additional JSON files

Some projects have JSON files beyond `package.json` that contain version fields (e.g., `.claude-plugin/marketplace.json`, `plugin.json`). The new `versionFiles` configuration option in `.changeset/config.json` identifies these files via glob patterns and uses JSONPath expressions to locate the version field(s) within each file.

Configuration example:

```json
{
  "changelog": [
    "@savvy-web/changesets/changelog",
    {
      "repo": "owner/repo",
      "versionFiles": [
        { "glob": "plugin.json", "paths": ["$.version"] },
        {
          "glob": ".claude-plugin/marketplace.json",
          "paths": ["$.metadata.version", "$.plugins[*].version"]
        }
      ]
    }
  ]
}
```

When `paths` is omitted, defaults to `["$.version"]`. Version resolution uses longest-prefix workspace matching for monorepo support. The feature includes a custom minimal JSONPath implementation supporting property access, array wildcards, and array index access with zero external dependencies.

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
