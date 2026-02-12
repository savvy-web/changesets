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

Chain all three layers in your `package.json` scripts:

```bash
changeset version \
  && savvy-changeset transform \
  && biome format --write .
```

This runs:

1. `changeset version` -- Calls Layer 2 (`getReleaseLine`)
   to generate CHANGELOG.md
2. `savvy-changeset transform` -- Runs Layer 3
   post-processing on the generated CHANGELOG.md
3. `biome format --write .` -- Normalizes formatting

### Pre-Commit Validation

Use the CLI to validate changeset files on commit:

```bash
savvy-changeset lint .changeset
```

Or integrate with lint-staged:

```json
{
  "lint-staged": {
    ".changeset/*.md": "savvy-changeset lint"
  }
}
```

### CI Gate

Use `savvy-changeset check` in CI to validate all
changeset files with a human-readable summary:

```bash
savvy-changeset check .changeset
```

Use `savvy-changeset transform --check` to verify that
CHANGELOG.md is already formatted (exits 1 if it would
change):

```bash
savvy-changeset transform --check CHANGELOG.md
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
