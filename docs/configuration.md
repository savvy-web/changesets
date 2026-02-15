# Configuration

This document covers all configuration options for
`@savvy-web/changesets` and how to integrate it into
your project.

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

The second element is the options object passed to both
`getReleaseLine` and `getDependencyReleaseLine` at
runtime.

## Options Reference

### `repo` (required)

GitHub repository in `owner/repository` format.

Used to construct commit links, PR links, and contributor
attribution via the GitHub API.

```json
{ "repo": "savvy-web/changesets" }
```

The value is validated against the pattern
`^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$`. If missing or
malformed, a descriptive error message guides you to
correct the configuration.

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

## CI Integration

### Version Script

Use the `version` command in your `package.json` scripts:

```bash
savvy-changesets version && biome format --write .
```

This runs:

1. `savvy-changesets version` -- Detects the package
   manager, runs `changeset version` (Layer 2), discovers
   all workspace CHANGELOG.md files, and runs Layer 3
   transform on each
2. `biome format --write .` -- Normalizes formatting

For monorepos, the `version` command automatically
discovers all workspace packages with CHANGELOG.md
files and transforms each one.

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

### CI Gate

Use `savvy-changesets check` in CI to validate all
changeset files with a human-readable summary:

```bash
savvy-changesets check .changeset
```

Use `savvy-changesets transform --check` to verify that
CHANGELOG.md is already formatted (exits 1 if it would
change):

```bash
savvy-changesets transform --check CHANGELOG.md
```

## Error Messages

The formatter provides actionable error messages for
common configuration problems:

**Missing options:**

```text
Configuration is required. Add options to your
changesets config:
"changelog": ["@savvy-web/changesets", {
  "repo": "owner/repository"
}]
```

**Missing repo:**

```text
Repository name is required. Add the "repo" option
to your changesets config:
"changelog": ["@savvy-web/changesets", {
  "repo": "owner/repository"
}]
```

**Invalid repo format:**

```text
Invalid repository format: "bad-value".
Expected format is "owner/repository"
(e.g., "microsoft/vscode")
```

## GitHub Token

The formatter uses the `GITHUB_TOKEN` environment
variable to fetch PR and commit metadata from the
GitHub API. If the token is not set, the formatter
degrades gracefully by omitting PR links and
contributor attribution.

In GitHub Actions, the token is available automatically.
For local development, export it in your shell:

```bash
export GITHUB_TOKEN="ghp_..."
```

## markdownlint Integration

The package exports markdownlint-compatible custom rules
from `@savvy-web/changesets/markdownlint`. This enables
real-time changeset validation in VS Code (via the
markdownlint extension) and in CI (via markdownlint-cli2)
without requiring the remark pipeline.

The default export is an array of three `Rule` objects,
compatible with markdownlint-cli2's `customRules` config.

### Custom Rules

- **CSH001** `changeset-heading-hierarchy` --
  h2 start, no h1 allowed, no depth skips
- **CSH002** `changeset-required-sections` --
  All h2 headings must match known categories
- **CSH003** `changeset-content-structure` --
  Non-empty sections, valid content structure

### Setup

The custom rules should only apply to changeset files,
not all markdown in the repository. The recommended
pattern uses a base config with the rules disabled
globally, and a directory-scoped override that enables
them for `.changeset/` only.

#### Automatic Setup

Run `savvy-changesets init` to configure everything
automatically. The init command searches for your
markdownlint config in these locations (first match wins):

1. `lib/configs/.markdownlint-cli2.jsonc`
2. `lib/configs/.markdownlint-cli2.json`
3. `.markdownlint-cli2.jsonc`
4. `.markdownlint-cli2.json`

To verify config after install, use `--check` (always
exits 0, suitable for postinstall scripts):

```bash
savvy-changesets init --check
```

#### Step 1: Register rules in the base config

Add the rules to your shared markdownlint-cli2 config
(e.g., `lib/configs/.markdownlint-cli2.jsonc` or
`.markdownlint-cli2.jsonc` in the project root):

```jsonc
{
  "customRules": ["@savvy-web/changesets/markdownlint"]
}
```

#### Step 2: Disable rules globally

In the same base config, disable the custom rules so they
do not fire on non-changeset markdown:

```jsonc
{
  "config": {
    "changeset-heading-hierarchy": false,
    "changeset-required-sections": false,
    "changeset-content-structure": false
  }
}
```

#### Step 3: Enable rules for changeset files

Create `.changeset/.markdownlint.json` to scope the rules
to changeset files only:

```json
{
  "extends": "../lib/configs/.markdownlint-cli2.jsonc",
  "default": false,
  "changeset-heading-hierarchy": true,
  "changeset-required-sections": true,
  "changeset-content-structure": true,
  "MD041": false
}
```

This config:

- Extends the base config (inherits `customRules`)
- Disables all default rules (`"default": false`) since
  changeset files do not need standard markdown linting
- Enables only the three changeset-specific rules
- Disables MD041 (first-line-heading) because changeset
  files start with YAML frontmatter, not a heading
