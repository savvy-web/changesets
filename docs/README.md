# Documentation

Advanced documentation for `@savvy-web/changesets`.

## Contents

- [Configuration](./configuration.md) -- Setup, options, version files, markdownlint integration, CI scripts
- [Changeset Format](./changeset-format.md) -- How to write changeset files with section headings
- [Section-Aware Pipeline](./section-aware-pipeline.md) -- End-to-end walkthrough of how changesets flow through the three-layer pipeline
- [CLI Reference](./cli.md) -- `savvy-changesets` commands (init, lint, check, validate-file, transform, version)
- [API Reference](./api.md) -- Classes, types, Effect services, remark plugins
- [Architecture](./architecture.md) -- Three-layer pipeline design and export map

## Markdownlint Rules

Each custom rule has detailed documentation with valid/invalid examples, fix instructions, and rationale:

| Rule | Alias | Description |
| :--- | :--- | :--- |
| [`CSH001`](rules/CSH001.md) | `changeset-heading-hierarchy` | h2-only top level, no h1, no heading level skips |
| [`CSH002`](rules/CSH002.md) | `changeset-required-sections` | All h2 headings must match one of 13 known categories |
| [`CSH003`](rules/CSH003.md) | `changeset-content-structure` | Non-empty sections, code block languages, list item structure |
| [`CSH004`](rules/CSH004.md) | `changeset-uncategorized-content` | All content must appear under a category heading |
| [`CSH005`](rules/CSH005.md) | `changeset-dependency-table-format` | Dependencies section must use structured GFM table |

Error messages from both markdownlint and remark-lint rules include actionable fix instructions and a documentation URL linking to the rule docs on GitHub. This makes errors self-contained for AI-agent workflows -- agents can resolve issues without examining source code.

## Claude Code Plugin

A companion [Claude Code](https://docs.anthropic.com/en/docs/claude-code) plugin lives in [`plugin/`](../plugin/) and integrates with the `savvy-changesets` CLI to help AI agents write well-structured changeset files. See the [package README](../package/README.md#claude-code-plugin) for installation instructions.

The plugin provides:

- **SessionStart hook** -- Injects changeset format context, available CLI commands, and bump type guidelines into the session, and persists per-session env (`CHANGESETS_PROJECT_DIR`, `CHANGESETS_PLUGIN_ROOT`, `CHANGESETS_PACKAGE_MANAGER`, etc.) for sibling hooks. Dynamically detects the project's package manager to construct the correct `savvy-changesets` invocation.
- **PreToolUse hook (Bash)** -- Before `git push` from a feature branch, denies the push when the diff against `origin/main` (or `origin/master`) contains no added or modified `.changeset/*.md`. Override per-invocation with `CHANGESETS_SKIP_PUSH_CHECK=1 git push ...` (inline or via `env(1)`), or for the whole session by exporting it before launching Claude Code.
- **PostToolUse hook (Write|Edit)** -- After any write or edit to a `.changeset/*.md` file, automatically runs `savvy-changesets validate-file` and feeds errors back to the agent for immediate correction.
- **Skills** -- Interactive commands (`/changesets:create`, `/changesets:check`, `/changesets:list`, `/changesets:preview`, `/changesets:squash`, `/changesets:style`) for guided changeset management.
- **changeset-manager agent** -- Autonomous subagent that analyzes diffs, detects affected packages, and reconciles changesets (create / update / merge / delete).
