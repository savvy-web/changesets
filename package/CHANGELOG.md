# @savvy-web/changesets

## 0.8.0

### Other

* [`324d2ec`](https://github.com/savvy-web/changesets/commit/324d2ec429b826befb5fa762c3f3ec195439e022) Support TypeScript v6

## 0.7.4

### Bug Fixes

* [`8721a98`](https://github.com/savvy-web/changesets/commit/8721a98483af5b9a5fd7f0ddb4cb14f60b2292b0) Add missing `hookEventName` field to SessionStart hook JSON output, fixing validation errors
* Consume stdin in SessionStart hook to prevent broken pipe errors
* Convert SessionStart hook `additionalContext` from markdown to XML tags for reliable parsing

## 0.7.3

### Bug Fixes

* [`f4c116f`](https://github.com/savvy-web/changesets/commit/f4c116fa21177377c3e251f493a7930e897c5704) Fixed session-start hook to output structured JSON with `hookSpecificOutput.additionalContext` instead of raw text, matching the expected hook response format
* Added error trapping and `CLAUDE_PROJECT_DIR` guard for better failure diagnostics

## 0.7.2

### Dependencies

* | [`5d46ce6`](https://github.com/savvy-web/changesets/commit/5d46ce6efe246f3bce9cf19102debeb1839e2a11) | Dependency | Type    | Action | From   | To |
  | :--------------------------------------------------------------------------------------------------- | :--------- | :------ | :----- | :----- | -- |
  | @savvy-web/silk-effects                                                                              | dependency | added   | —      | ^0.2.1 |    |
  | jsonc-effect                                                                                         | dependency | added   | —      | ^0.2.1 |    |
  | workspaces-effect                                                                                    | dependency | added   | —      | ^0.3.0 |    |
  | jsonc-parser                                                                                         | dependency | removed | ^3.3.1 | —      |    |
  | workspace-tools                                                                                      | dependency | removed | 0.41.0 | —      |    |

### Other

* [`5d46ce6`](https://github.com/savvy-web/changesets/commit/5d46ce6efe246f3bce9cf19102debeb1839e2a11) Adopt shared Silk Suite libraries, replacing internal implementations with Effect services:

- Replace changeset config reading with `ChangesetConfigReader` from `@savvy-web/silk-effects`
- Replace `jsonc-parser` with `jsonc-effect` for Effect-native JSONC operations
- Replace `workspace-tools` with `workspaces-effect` Effect services (`WorkspaceDiscovery`, `PackageManagerDetector`, `WorkspaceRoot`)
- Delete `Workspace` static utility class

## 0.7.1

### Bug Fixes

* [`85244d7`](https://github.com/savvy-web/changesets/commit/85244d74c9fbfead720c4df1a079b8c69dda7394) Plugin hooks no longer block tool calls or prevent Claude from stopping. All hooks now return structured JSON with `additionalContext` instead of using `exit 2` error codes.

- Pre-commit reminder provides context instead of blocking `git commit`
- Changeset validation returns errors as context instead of failing the hook
- Removed redundant Stop hook that prevented Claude from finishing
- Narrowed SessionStart matcher to `startup` only (skip on resume/clear/compact)

## 0.7.0

### Features

* [`3a36df4`](https://github.com/savvy-web/changesets/commit/3a36df48a85305c9f169628ab6380d52cf28f572) ### `validate-file` CLI Command

New `savvy-changesets validate-file <path>` command that validates a single changeset file against all lint rules. Outputs machine-readable diagnostics in `file:line:col rule message` format and exits with code 1 on errors. Designed for use in editor integrations and automation hooks.

### Build System

* [`3a36df4`](https://github.com/savvy-web/changesets/commit/3a36df48a85305c9f169628ab6380d52cf28f572) Restructured to a monorepo layout with source code under `package/`, enabling the CLI binary to be linked and available via `pnpm exec savvy-changesets` for hook integration.

### Claude Code Plugin Hooks

The companion Claude Code plugin now includes automated validation hooks:

* **PostToolUse hook** validates `.changeset/*.md` files immediately after they are written or edited, feeding lint errors back for correction
* **Stop hook** runs `savvy-changesets check .changeset` when the agent finishes to catch any remaining issues
* **SessionStart hook** injects format context, available CLI commands, and bump type guidelines at the start of each session, with dynamic package manager detection

## 0.6.0

### Features

* [`cf1237e`](https://github.com/savvy-web/changesets/commit/cf1237e64ae0372edbaede63c439730bf0294dd6) ### Claude Code Plugin

Add a companion Claude Code plugin (`changesets`) that helps agents and users write well-structured changeset files for GitHub release documentation. Install from the `savvy-web-bots` marketplace.

#### Skills

* `/changesets:create` — interactively create a changeset by analyzing the git diff, detecting affected packages, proposing bump types, and drafting content with valid section headings
* `/changesets:check` — validate existing `.changeset/*.md` files against the CSH001–CSH005 structural rules
* `/changesets:list` — overview of pending changesets with packages, bump types, and content previews
* `/changesets:update` — edit an existing changeset's content, bump types, or affected packages
* `/changesets:merge` — combine changesets that share the same package-to-bump-type mapping into a single file
* `/changesets:delete` — remove one or more changesets that are no longer needed
* `/changesets:preview` — preview what the combined CHANGELOG output would look like with all pending changesets
* `changesets:format` — auto-activating format reference that injects the complete format specification when Claude works with changeset files
* `changesets:status` — auto-activating awareness skill that prevents duplicate changesets and surfaces management options

#### Agent

* `changeset-writer` — autonomous subagent that Claude dispatches after completing implementation work to create properly structured changesets focused on release documentation quality

#### Hooks

* Pre-commit nudge — reminds the agent to consider creating a changeset before committing
* Write validation — validates changeset structure when writing to `.changeset/*.md`
* Post-task reminder — nudges if source files were modified but no changeset was created

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
