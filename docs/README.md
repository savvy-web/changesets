# Documentation

Advanced documentation for `@savvy-web/changesets`.

## Contents

- [Configuration](./configuration.md) -- Setup, options, version files, markdownlint integration, CI scripts
- [Changeset Format](./changeset-format.md) -- How to write changeset files with section headings
- [Section-Aware Pipeline](./section-aware-pipeline.md) -- End-to-end walkthrough of how changesets flow through the three-layer pipeline
- [CLI Reference](./cli.md) -- `savvy-changesets` commands (init, lint, check, transform, version)
- [API Reference](./api.md) -- Classes, types, Effect services, remark plugins
- [Architecture](./architecture.md) -- Three-layer pipeline design and export map

## Markdownlint Rules

Each custom rule has detailed documentation with valid/invalid examples, fix instructions, and rationale:

| Rule | Alias | Description |
| :--- | :--- | :--- |
| [`CSH001`](../src/markdownlint/rules/docs/CSH001.md) | `changeset-heading-hierarchy` | h2-only top level, no h1, no heading level skips |
| [`CSH002`](../src/markdownlint/rules/docs/CSH002.md) | `changeset-required-sections` | All h2 headings must match one of 13 known categories |
| [`CSH003`](../src/markdownlint/rules/docs/CSH003.md) | `changeset-content-structure` | Non-empty sections, code block languages, list item structure |
| [`CSH004`](../src/markdownlint/rules/docs/CSH004.md) | `changeset-uncategorized-content` | All content must appear under a category heading |

Error messages from both markdownlint and remark-lint rules include actionable fix instructions and a documentation URL linking to the rule docs on GitHub. This makes errors self-contained for AI-agent workflows -- agents can resolve issues without examining source code.
