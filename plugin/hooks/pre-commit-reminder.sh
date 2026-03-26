#!/usr/bin/env bash
set -euo pipefail

# PreToolUse hook: remind about changesets before git commit.
# Reads hook input JSON from stdin, checks if the command is a git commit,
# and only then prompts the agent to consider creating a changeset.

input=$(cat)

command=$(echo "$input" | jq -r '.tool_input.command // empty')

if [[ -z "$command" ]]; then
  exit 0
fi

# Only trigger on git commit commands
if [[ ! "$command" =~ git[[:space:]]+commit ]]; then
  exit 0
fi

echo "You are about to run a git commit. Consider: does this change introduce user-facing behavior that should be documented in a changeset for GitHub releases? Changesets are release documentation — they describe what users upgrading the package need to know. They are not an exhaustive log of every internal change. If a changeset is appropriate and one hasn't been created yet in this session, consider creating one before committing. This is a suggestion, not a requirement — use your judgment." >&2
exit 2
