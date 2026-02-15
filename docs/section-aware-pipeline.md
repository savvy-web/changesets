# Section-Aware Pipeline

This document walks through a concrete example of how section-aware changeset files flow through the three-layer pipeline and produce a clean, organized CHANGELOG.

## The Problem

Standard Changesets treats each changeset summary as flat text. When `changeset version` assembles the CHANGELOG, it dumps every entry under a single `### Minor Changes` or `### Patch Changes` heading. The result is a long, unsorted list with no categorization:

```markdown
## 2.1.0

### Minor Changes

- abc1234: Added OAuth2 login flow
- def5678: Fixed memory leak in WebSocket handler
- ghi9012: Updated contributing guide
- jkl3456: Refactored database connection pool
```

There is no way to tell which entries are features, which are bug fixes, and which are documentation changes. Readers must scan every line.

## The Solution

With `@savvy-web/changesets`, each changeset file uses h2 section headings to categorize its changes. The three-layer pipeline validates the structure, formats each entry with GitHub attribution, and then post-processes the assembled CHANGELOG to merge, sort, and deduplicate sections.

## Walkthrough

Imagine a release where three developers each submit a changeset for the same package.

### Step 1: Write Changeset Files

**Alice** adds a feature and updates docs (`.changeset/add-oauth.md`):

```markdown
---
"@acme/auth": minor
---

## Features

Added OAuth2 login flow with PKCE support.

## Documentation

- Added OAuth2 setup guide
- Updated API reference with new endpoints
```

**Bob** fixes a bug and adds tests (`.changeset/fix-websocket.md`):

```markdown
---
"@acme/auth": patch
---

## Bug Fixes

Fixed memory leak in WebSocket reconnection handler.

## Tests

- Added stress test for WebSocket reconnection
- Updated mock server fixtures
```

**Carol** adds another feature (`.changeset/add-mfa.md`):

```markdown
---
"@acme/auth": minor
---

## Features

Added multi-factor authentication with TOTP support.
```

### Step 2: Validate (Layer 1)

Before these files enter the pipeline, the remark-lint rules validate their structure:

```bash
$ savvy-changesets check .changeset

All changeset files passed validation.
```

The three rules verify:

- **heading-hierarchy** -- All headings start at h2, no skips
- **required-sections** -- "Features", "Bug Fixes", "Documentation", and "Tests" are all valid categories
- **content-structure** -- Every section has content beneath it

### Step 3: Format (Layer 2)

When `changeset version` runs, it calls `getReleaseLine` for each changeset. The formatter parses sections, fetches GitHub PR/commit metadata, and returns formatted markdown.

Each changeset produces its own output block. Because Changesets assembles these blocks sequentially, the raw CHANGELOG looks like this:

```markdown
## 2.1.0

### Minor Changes

### Features

- Added OAuth2 login flow with PKCE support.
  ([#42](https://github.com/acme/auth/pull/42))

### Documentation

- Added OAuth2 setup guide
- Updated API reference with new endpoints

### Features

- Added multi-factor authentication with TOTP
  support.
  ([#44](https://github.com/acme/auth/pull/44))

### Patch Changes

### Bug Fixes

- Fixed memory leak in WebSocket reconnection
  handler.
  ([#43](https://github.com/acme/auth/pull/43))

### Tests

- Added stress test for WebSocket reconnection
- Updated mock server fixtures
```

Notice the problems:

1. **Duplicate headings** -- "Features" appears twice
2. **Wrong order** -- Bug Fixes appears after the second Features block, not grouped together
3. **Empty sections** -- "Minor Changes" and "Patch Changes" are empty wrappers left by Changesets

### Step 4: Transform (Layer 3)

The `savvy-changesets version` command (or `savvy-changesets transform` standalone) runs six remark plugins that clean up the assembled output:

| Plugin | What It Does |
| :--- | :--- |
| merge-sections | Combines duplicate section headings |
| reorder-sections | Sorts sections by category priority |
| deduplicate-items | Removes any duplicate list items |
| contributor-footnotes | Aggregates contributor attributions |
| issue-link-refs | Consolidates reference-style links |
| normalize-format | Removes empty wrapper sections |

### Step 5: Final Output

After transformation and Biome formatting, the CHANGELOG reads:

```markdown
## 2.1.0

### Features

- Added OAuth2 login flow with PKCE support.
  ([#42](https://github.com/acme/auth/pull/42))
- Added multi-factor authentication with TOTP
  support.
  ([#44](https://github.com/acme/auth/pull/44))

### Bug Fixes

- Fixed memory leak in WebSocket reconnection
  handler.
  ([#43](https://github.com/acme/auth/pull/43))

### Documentation

- Added OAuth2 setup guide
- Updated API reference with new endpoints

### Tests

- Added stress test for WebSocket reconnection
- Updated mock server fixtures
```

The result is:

- **Merged** -- Both feature entries under one heading
- **Sorted** -- Features before Bug Fixes before Documentation before Tests (by priority)
- **Clean** -- No empty "Minor Changes" or "Patch Changes" wrappers
- **Attributed** -- Each entry links to its PR

## Monorepo Support

In a monorepo, `changeset version` generates a CHANGELOG.md in each affected package directory. The `savvy-changesets version` command discovers all workspace packages and transforms every CHANGELOG:

```bash
$ savvy-changesets version
Detected package manager: pnpm
Running: pnpm exec changeset version
Found 3 CHANGELOG.md file(s)
Transformed @acme/auth → packages/auth/CHANGELOG.md
Transformed @acme/api → packages/api/CHANGELOG.md
Transformed @acme/ui → packages/ui/CHANGELOG.md
```

For a single-package repo, it works the same way but only transforms the root CHANGELOG.md.

## CI Integration

The recommended `ci:version` script:

```json
{
  "scripts": {
    "ci:version": "savvy-changesets version"
  }
}
```

This runs the full pipeline (Layer 2 + Layer 3) and then normalizes formatting with Biome.

## Further Reading

- [Changeset Format](./changeset-format.md) -- How to write changeset files with section headings
- [CLI Reference](./cli.md) -- All CLI commands and options
- [Architecture](./architecture.md) -- Three-layer pipeline design
