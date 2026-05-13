# Configuration

This document covers all configuration options for `@savvy-web/changesets` and how to integrate it into your project.

## Changesets Config

Add the changelog formatter to `.changeset/config.json`:

```json
{
  "changelog": [
    "@savvy-web/changesets/changelog",
    { "repo": "owner/repo" }
  ]
}
```

The second element is the options object passed to both `getReleaseLine` and `getDependencyReleaseLine` at runtime.

## Options Reference

### `repo` (required)

GitHub repository in `owner/repository` format.

Used to construct commit links, PR links, and contributor attribution via the GitHub API.

```json
{ "repo": "savvy-web/changesets" }
```

The value is validated against the pattern `^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$`. If missing or malformed, a descriptive error message guides you to correct the configuration.

### `commitLinks` (optional)

Whether to include commit hash links in output.

- Type: `boolean`
- Default: not set

### `prLinks` (optional)

Whether to include pull request links in output.

- Type: `boolean`
- Default: not set

### `issueLinks` (optional)

Whether to include issue reference links in output.

- Type: `boolean`
- Default: not set

### `issuePrefixes` (optional)

Custom issue reference prefixes to recognize.

- Type: `string[]`
- Default: not set
- Example: `["#", "GH-"]`

### `packages` (recommended in 0.9.0+)

Per-package release surfaces. Maps each workspace package name to its non-workspace files: `additionalScopes` (globs that belong to the package even though they live outside the workspace directory) and `versionFiles` (JSON files whose version field is bumped in lockstep with the package).

- Type: `Record<string, { additionalScopes?: string[]; versionFiles?: Array<{ glob: string; paths?: string[] }> }>`
- Default: not set (single-workspace projects don't need it)

```json
{
  "changelog": ["@savvy-web/changesets/changelog", {
    "repo": "owner/repo",
    "packages": {
      "@savvy-web/changesets": {
        "additionalScopes": ["plugin/**"],
        "versionFiles": [
          {
            "glob": "plugin/.claude-plugin/plugin.json",
            "paths": ["$.version"]
          }
        ]
      }
    }
  }]
}
```

In this example, the companion Claude Code plugin under `plugin/**` is declared as part of `@savvy-web/changesets`'s release surface. Every file in `plugin/**` classifies as owned by `@savvy-web/changesets`. The `plugin.json` manifest's `$.version` field is bumped in lockstep with `@savvy-web/changesets`'s version.

#### `packages[<name>].additionalScopes` (optional)

Repo-relative globs naming files outside the workspace package's directory that belong to its release surface. Negation patterns (`!path/**`) are supported.

- Type: `string[]`
- Default: not set
- Rules: globs must be repo-relative — absolute paths and parent traversal (`../`) are rejected.

#### `packages[<name>].versionFiles` (optional)

JSON files whose version field is updated alongside the workspace package's version during `savvy-changesets version`. Each entry has a `glob` and an optional `paths` array of JSONPath expressions.

- Type: `Array<{ glob: string; paths?: string[] }>`
- Default: not set

The `package` field that lived on each entry in the legacy shape is dropped — the parent record key names the owner, so per-entry `package` is redundant.

#### Supported JSONPath Syntax

| Pattern | Description | Example |
| :--- | :--- | :--- |
| `$.foo.bar` | Nested property access | `$.metadata.version` |
| `$.foo[*].bar` | Array wildcard (iterates all elements) | `$.plugins[*].version` |
| `$.foo[0].bar` | Array index access | `$.entries[0].version` |

All expressions must start with `$.`.

#### Validation Contracts

`ConfigInspector` enforces these cross-package rules at config-load time. `version` and `transform` refuse to run when any of them is violated; `lint` is unaffected (it never reads the config).

| Rule | Reason |
| :--- | :--- |
| `packages` keys must resolve to known workspace packages | Catches typos and stale entries |
| `additionalScopes` globs of two different packages must not overlap | A file belongs to exactly one release surface |
| `additionalScopes` of one package must not shadow another package's workspace directory | Prevents one package from silently claiming another's files |
| Two `versionFiles` entries must not target the same `(file, JSONPath)` tuple | Prevents conflicting writes during `version` |
| A config cannot declare both `packages` and the legacy top-level `versionFiles[]` | Pick one shape |

When validation fails, `savvy-changesets config validate` exits non-zero with a structured error naming the field and the conflict.

#### Formatting Preservation

The version-file updater detects the existing indent style (tabs or spaces) and preserves trailing newlines, so version bumps produce minimal diffs.

#### Dry Run

When `savvy-changesets version --dry-run` is used, version file updates are simulated and logged without writing to disk.

### `versionFiles` (deprecated — 0.9.0, removed in 1.0.0)

The original flat top-level shape, kept during 0.9.0 for backwards compatibility:

- Type: `Array<{ glob: string; paths?: string[]; package?: string }>`

Configs that still use this shape produce a one-line deprecation warning on every `savvy-changesets` run (stderr, naming the config path and the required edit). `savvy-changesets config show` reports `legacyVersionFilesUsed: true`. `savvy-changesets init` also flags the deprecation when run against an existing config.

#### Migrating from `versionFiles[]`

**Before** (0.8.x):

```json
{
  "changelog": ["@savvy-web/changesets/changelog", {
    "repo": "owner/repo",
    "versionFiles": [
      {
        "glob": "plugin/.claude-plugin/plugin.json",
        "paths": ["$.version"],
        "package": "@savvy-web/changesets"
      }
    ]
  }]
}
```

**After** (0.9.0+):

```json
{
  "changelog": ["@savvy-web/changesets/changelog", {
    "repo": "owner/repo",
    "packages": {
      "@savvy-web/changesets": {
        "versionFiles": [
          {
            "glob": "plugin/.claude-plugin/plugin.json",
            "paths": ["$.version"]
          }
        ]
      }
    }
  }]
}
```

Mechanical translation:

1. Remove the top-level `versionFiles` array.
2. Add a `packages` record.
3. Group entries by their `package` field — each group becomes one entry in the record.
4. Drop the `package` field from each entry (the parent key carries it now).
5. Optional but recommended: add `additionalScopes` if files outside the workspace directory belong to the package's release surface beyond just the version file.

Run `savvy-changesets config show --json` after migrating to confirm the resolved shape matches expectations.

## CI Integration

### Version Script

Use the `version` command in your `package.json` scripts:

```bash
savvy-changesets version && biome format --write .
```

This runs:

1. `savvy-changesets version` -- Detects the package manager, runs `changeset version` (Layer 2), discovers all workspace CHANGELOG.md files, and runs Layer 3 transform on each
2. `biome format --write .` -- Normalizes formatting

For monorepos, the `version` command automatically discovers all workspace packages with CHANGELOG.md files and transforms each one.

### Pre-Commit Validation

Use the CLI to validate changeset files on commit:

```bash
savvy-changesets lint .changeset
```

Or integrate with lint-staged:

```json
{
  "lint-staged": {
    ".changeset/*.md": "savvy-changesets lint"
  }
}
```

### Single-File Validation

Use `savvy-changesets validate-file` to validate individual changeset files. This is designed for editor integrations and automation hooks:

```bash
savvy-changesets validate-file .changeset/cool-lions-sing.md
```

The companion Claude Code plugin uses this command in its PostToolUse hook to validate changeset files immediately after they are written or edited by an AI agent.

### CI Gate

Use `savvy-changesets check` in CI to validate all changeset files with a human-readable summary:

```bash
savvy-changesets check .changeset
```

Use `savvy-changesets transform --check` to verify that CHANGELOG.md is already formatted (exits 1 if it would change):

```bash
savvy-changesets transform --check CHANGELOG.md
```

## Error Messages

The formatter provides actionable error messages for common configuration problems:

**Missing options:**

```text
Configuration is required. Add options to your changesets config:
"changelog": ["@savvy-web/changesets", {
  "repo": "owner/repository"
}]
```

**Missing repo:**

```text
Repository name is required. Add the "repo" option to your changesets config:
"changelog": ["@savvy-web/changesets", {
  "repo": "owner/repository"
}]
```

**Invalid repo format:**

```text
Invalid repository format: "bad-value".
Expected format is "owner/repository" (e.g., "microsoft/vscode")
```

## GitHub Token

The formatter uses the `GITHUB_TOKEN` environment variable to fetch PR and commit metadata from the GitHub API. If the token is not set, the formatter degrades gracefully by omitting PR links and contributor attribution.

In GitHub Actions, the token is available automatically. For local development, export it in your shell:

```bash
export GITHUB_TOKEN="ghp_..."
```

## markdownlint Integration

The package exports markdownlint-compatible custom rules from `@savvy-web/changesets/markdownlint`. This enables real-time changeset validation in VS Code (via the markdownlint extension) and in CI (via markdownlint-cli2) without requiring the remark pipeline.

The default export is an array of five `Rule` objects, compatible with markdownlint-cli2's `customRules` config.

### Custom Rules

- **CSH001** `changeset-heading-hierarchy` -- h2 start, no h1 allowed, no depth skips
- **CSH002** `changeset-required-sections` -- All h2 headings must match known categories
- **CSH003** `changeset-content-structure` -- Non-empty sections, valid content structure
- **CSH004** `changeset-uncategorized-content` -- All content must appear under a category heading
- **CSH005** `changeset-dependency-table-format` -- Dependencies section must use a structured GFM table

Each rule has detailed documentation with valid/invalid examples, fix instructions, and rationale. See the [rule docs](rules/).

All error messages include inline fix instructions and a documentation URL, making them self-contained for AI-agent and CI workflows.

### Setup

The custom rules should only apply to changeset files, not all markdown in the repository. The recommended pattern uses a base config with the rules disabled globally, and a directory-scoped override that enables them for `.changeset/` only.

#### Automatic Setup

Run `savvy-changesets init` to configure everything automatically. The init command searches for your markdownlint config in these locations (first match wins):

1. `lib/configs/.markdownlint-cli2.jsonc`
2. `lib/configs/.markdownlint-cli2.json`
3. `.markdownlint-cli2.jsonc`
4. `.markdownlint-cli2.json`

To verify config after install, use `--check` (always exits 0, suitable for postinstall scripts):

```bash
savvy-changesets init --check
```

#### Step 1: Register rules in the base config

Add the rules to your shared markdownlint-cli2 config (e.g., `lib/configs/.markdownlint-cli2.jsonc` or `.markdownlint-cli2.jsonc` in the project root):

```jsonc
{
  "customRules": ["@savvy-web/changesets/markdownlint"]
}
```

#### Step 2: Disable rules globally

In the same base config, disable the custom rules so they do not fire on non-changeset markdown:

```jsonc
{
  "config": {
    "changeset-heading-hierarchy": false,
    "changeset-required-sections": false,
    "changeset-content-structure": false,
    "changeset-uncategorized-content": false,
    "changeset-dependency-table-format": false
  }
}
```

#### Step 3: Enable rules for changeset files

Create `.changeset/.markdownlint.json` to scope the rules to changeset files only:

```json
{
  "extends": "../lib/configs/.markdownlint-cli2.jsonc",
  "default": false,
  "changeset-heading-hierarchy": true,
  "changeset-required-sections": true,
  "changeset-content-structure": true,
  "changeset-uncategorized-content": true,
  "changeset-dependency-table-format": true,
  "MD041": false
}
```

This config:

- Extends the base config (inherits `customRules`)
- Disables all default rules (`"default": false`) since changeset files do not need standard markdown linting
- Enables the five changeset-specific rules
- Disables MD041 (first-line-heading) because changeset files start with YAML frontmatter, not a heading
