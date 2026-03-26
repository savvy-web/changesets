#!/usr/bin/env bash
set -euo pipefail

# SessionStart hook: inject changeset context into the session.
# Outputs context about the @savvy-web/changesets format, available tools,
# and active hooks so the agent understands the changeset workflow.

# Detect package manager (mirrors .husky/pre-commit pattern)
detect_pm() {
  local root="$CLAUDE_PROJECT_DIR"
  if [ -f "$root/package.json" ]; then
    pm=$(jq -r '.packageManager // empty' "$root/package.json" 2>/dev/null | cut -d'@' -f1)
    if [ -n "$pm" ]; then
      echo "$pm"
      return
    fi
  fi
  if [ -f "$root/pnpm-lock.yaml" ]; then
    echo "pnpm"
  elif [ -f "$root/yarn.lock" ]; then
    echo "yarn"
  elif [ -f "$root/bun.lock" ]; then
    echo "bun"
  else
    echo "npm"
  fi
}

PM=$(detect_pm)

case "$PM" in
  pnpm) RUN="pnpm exec savvy-changesets" ;;
  yarn) RUN="yarn exec savvy-changesets" ;;
  bun)  RUN="bunx savvy-changesets" ;;
  *)    RUN="npx --no -- savvy-changesets" ;;
esac

cat <<CONTEXT
## @savvy-web/changesets — Session Context

This project uses **section-aware changesets** via @savvy-web/changesets. Changesets are release documentation — they describe what users upgrading the package need to know, organized under category headings.

### Changeset Format

Changeset files live in \`.changeset/\` and follow this structure:

\`\`\`markdown
---
"@savvy-web/package-name": patch | minor | major
---

## Features

- Description of what was added

## Bug Fixes

- Description of what was fixed
\`\`\`

**Key rules:**
- YAML frontmatter declares affected packages and bump types
- All content goes under \`##\` category headings (no content before the first heading)
- Valid headings: Breaking Changes, Features, Bug Fixes, Performance, Documentation, Refactoring, Tests, Build System, CI, Dependencies, Maintenance, Reverts, Other
- No \`#\` (h1) headings — those are reserved for the changelog formatter
- No heading depth skips (e.g., \`##\` to \`####\`)
- Code fences must have a language identifier
- Focus on what someone upgrading needs to know, not implementation details

### Content Structure

For **patch** changes, keep it simple — \`## Category\` with bullet points.

For **minor** and **major** changes, use \`### Named Feature\` sub-headings under \`## Category\` sections to give each distinct feature or change its own heading. This makes the changelog scannable and gives each feature a clear identity:

\`\`\`markdown
## Features

### Hybrid Transformation Pipeline

Replaces custom dependency resolution with a two-stage approach.

* Stage 1: Apply pnpm transformations
* Stage 2: Apply RSLib transformations

### Runtime Auto-Detection

Automatically detects runtime entry points from \`src/runtime/index.tsx\`.
\`\`\`

Prefer this structured approach over flat bullet lists when a minor/major changeset covers multiple distinct capabilities or named features.

### Available Tools

- **CLI**: \`savvy-changesets\` is available via \`${RUN}\`
  - \`${RUN} check .changeset\` — validate all changesets with human-readable summary
  - \`${RUN} lint .changeset\` — machine-readable validation (file:line:col format)
  - \`${RUN} validate-file <path>\` — validate a single changeset file
  - \`${RUN} transform <file>\` — post-process CHANGELOG.md
  - \`${RUN} version\` — run changeset version and transform all CHANGELOGs

- **Skills** (invoke via \`/changesets:<name>\`):
  - \`/changesets:create\` — guided changeset creation with diff analysis and bump type proposals
  - \`/changesets:check\` — validate existing changesets
  - \`/changesets:status\` — review pending changesets
  - \`/changesets:format\` — full format specification reference

### Active Hooks

- **PostToolUse (Write|Edit)**: After writing a \`.changeset/*.md\` file, the CLI automatically validates it. If validation fails, errors are fed back to you — fix the file before proceeding.
- **Stop**: When you finish responding, all changesets are validated and you're reminded if source files were modified without a changeset.
- **PreToolUse (Bash)**: Before git commits, you're prompted to consider whether a changeset is needed.

### Bump Type Guidelines

- **patch** — bug fixes, docs, internal refactoring, tests, CI/build changes
- **minor** — new features, new exports, non-breaking additions
- **major** — removed exports, changed signatures, breaking behavior changes
CONTEXT

exit 0
