# @savvy-web/changesets

[![npm version][npm-badge]][npm-url]
[![License: MIT][license-badge]][license-url]
[![Node.js >= 24][node-badge]][node-url]

Custom changelog formatter and markdown processing pipeline for the Silk Suite. Replaces the default `@changesets/cli/changelog` formatter with a three-layer architecture that validates changeset files, formats structured changelog entries, and post-processes the generated CHANGELOG.md.

## Features

- **Section-aware changesets** -- Categorize changes with h2 headings (Features, Bug Fixes, Breaking Changes, etc.)
- **Three-layer pipeline** -- Pre-validation (remark-lint), changelog formatting (Changesets API), and post-processing (remark-transform)
- **CLI tooling** -- `savvy-changesets` binary with init, lint, check, validate-file, transform, and version subcommands
- **GitHub integration** -- Automatic PR links, commit references, and contributor attribution
- **Version file syncing** -- Bump version fields in additional JSON files using glob patterns and JSONPath expressions
- **Editor support** -- markdownlint rules for real-time validation in VS Code and CI
- **Dependency table format** -- Structured GFM tables for tracking dependency changes with automatic collapse, sort, and aggregation
- **AI-agent-friendly errors** -- All lint and validation errors include inline fix instructions and documentation links, so AI agents can resolve issues without examining source code

## Installation

```bash
npm install @savvy-web/changesets -D
```

## Quick Start

Bootstrap your repository:

```bash
savvy-changesets init
```

This creates `.changeset/config.json` with auto-detected GitHub repo settings and configures markdownlint rules. Or configure manually:

```json
{
  "changelog": [
    "@savvy-web/changesets/changelog",
    { "repo": "owner/repo" }
  ]
}
```

Write [section-aware changeset](./docs/section-aware-pipeline.md) files using `## Section` headings to categorize changes:

````markdown
---
"@my/package": minor
---

## Features

### OAuth2 Authentication

Added a new authentication system with OAuth2 support for third-party providers.

### CLI `login` Command

New interactive login command that opens the browser for OAuth2 consent:

```bash
my-package login --provider github
```

Returns a session token that can be passed to subsequent commands:

```typescript
import { createSession } from "@my/package";

const session = await createSession({ provider: "github" });
```

## Bug Fixes

* Fixed token refresh race condition during concurrent requests
* Corrected redirect URI validation for localhost callbacks
````

## Claude Code Plugin

A companion [Claude Code](https://docs.anthropic.com/en/docs/claude-code) plugin is available that helps AI agents write well-structured changeset files. Install it at the project scope alongside the `@savvy-web/changesets` package:

```bash
# Add the Savvy Web plugin marketplace (one-time setup)
/plugin marketplace add savvy-web/systems

# Install the changesets plugin for this project
/plugin install changesets@savvy-web-systems --scope project
```

This adds the plugin to your `.claude/settings.json`:

```json
{
  "enabledPlugins": {
    "changesets@savvy-web-systems": true
  }
}
```

The plugin provides:

- **`/changesets:create`** -- interactive changeset creation with diff analysis and package detection
- **`/changesets:check`** -- validate changeset files against structural rules
- **`/changesets:list`**, **`:update`**, **`:merge`**, **`:delete`**, **`:preview`** -- manage pending changesets
- **`changesets:format`** / **`changesets:status`** -- auto-activating skills that guide agents on format rules and existing changeset awareness
- **`changeset-writer`** agent -- autonomous subagent for writing changesets after implementation work

**Automated validation hooks** run transparently in the background:

| Hook | Trigger | Action |
| ---- | ------- | ------ |
| **SessionStart** | Session begins | Injects changeset format rules and available tools into the agent context |
| **PostToolUse** | Agent writes/edits a `.changeset/*.md` file | Runs `savvy-changesets validate-file` on the changed file; feeds errors back for immediate correction |
| **PreToolUse** | Agent runs `git commit` | Prompts the agent to consider whether a changeset is needed |
| **Stop** | Agent finishes responding | Runs `savvy-changesets check` on all changesets and reminds the agent if source files were modified without a changeset |

To have Claude automatically manage changesets as part of a multi-step workflow, include it in your prompt:

> Implement the feature described in issue #42. When you're done, create a changeset documenting the user-facing changes for the GitHub release.

The agent will use the `changeset-writer` subagent to analyze the diff, detect affected packages, choose the appropriate content depth, and write a properly structured changeset file. The hooks ensure every changeset is validated as it is written and again before the session ends.

## Documentation

- [Configuration](./docs/configuration.md) -- Options, version files, markdownlint integration, CI scripts
- [Section-Aware Pipeline](./docs/section-aware-pipeline.md) -- End-to-end walkthrough of how section-aware changesets flow through the pipeline
- [Markdownlint Rule Docs](./docs/rules/) -- Per-rule documentation with examples, fix instructions, and rationale
- [CLI Reference](./docs/cli.md) -- All commands and options
- [API Reference](./docs/api.md) -- Classes, types, Effect services, remark plugins
- [Architecture](./docs/architecture.md) -- Three-layer pipeline design and export map

## License

[MIT](./LICENSE)

[npm-badge]: https://img.shields.io/npm/v/@savvy-web/changesets
[npm-url]: https://www.npmjs.com/package/@savvy-web/changesets
[license-badge]: https://img.shields.io/badge/License-MIT-yellow.svg
[license-url]: https://opensource.org/licenses/MIT
[node-badge]: https://img.shields.io/badge/node-%3E%3D24-brightgreen
[node-url]: https://nodejs.org/
