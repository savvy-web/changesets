#!/usr/bin/env bash
set -euo pipefail

# SessionStart hook: inject changeset context into the session.
# Outputs JSON with additionalContext about the @savvy-web/changesets format,
# available tools, and active hooks so the agent understands the changeset workflow.

# Error trap: surface failures instead of silently producing no output
trap 'echo "ERROR: session-start.sh failed at line $LINENO (exit $?)" >&2; exit 1' ERR

# Consume stdin to prevent broken pipe errors
cat > /dev/null

if [ -z "${CLAUDE_PROJECT_DIR:-}" ]; then
  echo "ERROR: CLAUDE_PROJECT_DIR is not set" >&2
  exit 1
fi

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

# Build the context as a variable, then wrap in JSON
CONTEXT=$(cat <<CONTEXT
<EXTREMELY_IMPORTANT>
<changesets_instructions>

<overview>
This project uses section-aware changesets via @savvy-web/changesets. Changesets are release documentation — they describe what users upgrading the package need to know, organized under category headings.
</overview>

<changeset_format>
Changeset files live in .changeset/ and follow this structure:

---
"@savvy-web/package-name": patch | minor | major
---

## Features

- Description of what was added

## Bug Fixes

- Description of what was fixed

<rules>
- YAML frontmatter declares affected packages and bump types
- All content goes under ## category headings (no content before the first heading)
- No # (h1) headings — those are reserved for the changelog formatter
- No heading depth skips (e.g., ## to ####)
- Code fences must have a language identifier
- Focus on what someone upgrading needs to know, not implementation details
</rules>

<valid_headings priority_order="true">
Breaking Changes, Features, Bug Fixes, Performance, Documentation, Refactoring, Tests, Build System, CI, Dependencies, Maintenance, Reverts, Other

Only these exact headings are allowed at the ## level. Use ### Sub-heading under a ## category for named features or distinct changes.
</valid_headings>
</changeset_format>

<content_structure>
For patch changes, keep it simple — ## Category with bullet points.

For minor and major changes, use ### Named Feature sub-headings under ## Category sections to give each distinct feature or change its own heading. This makes the changelog scannable and gives each feature a clear identity.

<example>
## Features

### Hybrid Transformation Pipeline

Replaces custom dependency resolution with a two-stage approach.

* Stage 1: Apply pnpm transformations
* Stage 2: Apply RSLib transformations

### Runtime Auto-Detection

Automatically detects runtime entry points from src/runtime/index.tsx.
</example>

Prefer this structured approach over flat bullet lists when a minor/major changeset covers multiple distinct capabilities or named features.
</content_structure>

<available_tools>
  <cli runner="${RUN}">
    ${RUN} check .changeset — validate all changesets with human-readable summary
    ${RUN} lint .changeset — machine-readable validation (file:line:col format)
    ${RUN} validate-file path — validate a single changeset file
    ${RUN} transform file — post-process CHANGELOG.md
    ${RUN} version — run changeset version and transform all CHANGELOGs
  </cli>

  <skills prefix="/changesets:">
    /changesets:create — guided changeset creation with diff analysis and bump type proposals
    /changesets:check — validate existing changesets
    /changesets:status — review pending changesets
    /changesets:format — full format specification reference
  </skills>
</available_tools>

<active_hooks>
  <hook event="PostToolUse" matcher="Write|Edit">
    After writing a .changeset/*.md file, the CLI automatically validates it. If validation finds issues, they are provided as context — fix the file before proceeding.
  </hook>
  <hook event="PreToolUse" matcher="Bash">
    Before git commits, you are reminded to consider whether a changeset is needed.
  </hook>
</active_hooks>

<bump_type_guidelines>
  patch — bug fixes, docs, internal refactoring, tests, CI/build changes
  minor — new features, new exports, non-breaking additions
  major — removed exports, changed signatures, breaking behavior changes
</bump_type_guidelines>

</changesets_instructions>
</EXTREMELY_IMPORTANT>
CONTEXT
)

# Output as JSON with additionalContext
jq -n --arg ctx "$CONTEXT" '{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": $ctx
  }
}'

exit 0
