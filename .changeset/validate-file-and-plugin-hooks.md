---
"@savvy-web/changesets": minor
---

## Features

### `validate-file` CLI Command

New `savvy-changesets validate-file <path>` command that validates a single changeset file against all lint rules. Outputs machine-readable diagnostics in `file:line:col rule message` format and exits with code 1 on errors. Designed for use in editor integrations and automation hooks.

### Claude Code Plugin Hooks

The companion Claude Code plugin now includes automated validation hooks:

- **PostToolUse hook** validates `.changeset/*.md` files immediately after they are written or edited, feeding lint errors back for correction
- **Stop hook** runs `savvy-changesets check .changeset` when the agent finishes to catch any remaining issues
- **SessionStart hook** injects format context, available CLI commands, and bump type guidelines at the start of each session, with dynamic package manager detection

## Build System

Restructured to a monorepo layout with source code under `package/`, enabling the CLI binary to be linked and available via `pnpm exec savvy-changesets` for hook integration.
