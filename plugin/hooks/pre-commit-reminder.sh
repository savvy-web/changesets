#!/usr/bin/env bash
set -uo pipefail

# PreToolUse hook: remind about changesets before git commit.
# Reads hook input JSON from stdin, checks if the command is a git commit,
# and returns additionalContext as a gentle nudge — never blocks.

input=$(cat)

command=$(echo "$input" | jq -r '.tool_input.command // empty')

if [[ -z "$command" ]]; then
  exit 0
fi

# Only trigger on commands that start with git commit
# (not commands that mention "git commit" in heredocs or strings)
if [[ ! "$command" =~ ^[[:space:]]*git[[:space:]]+commit ]]; then
  exit 0
fi

jq -n '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    additionalContext: "You are about to run a git commit. Consider: does this change introduce user-facing behavior that should be documented in a changeset? Changesets are release documentation — they describe what users upgrading the package need to know. If a changeset is appropriate and one has not been created yet, consider creating one before committing. This is a suggestion, not a requirement — use your judgment.\n\nChangeset files live in .changeset/ with YAML frontmatter declaring packages and bump types. All content must go under ## category headings. Valid ## headings: Breaking Changes, Features, Bug Fixes, Performance, Documentation, Refactoring, Tests, Build System, CI, Dependencies, Maintenance, Reverts, Other. Use ### sub-headings under ## categories for named features."
  }
}'
exit 0
