#!/usr/bin/env bash
set -euo pipefail

# PreToolUse hook: remind about changesets before git commit.
# Reads hook input JSON from stdin, checks if the command is a git commit,
# and emits additionalContext as a gentle nudge — never blocks.

# shellcheck source=../lib/hook-output.sh
. "$(dirname "$0")/../lib/hook-output.sh"
# shellcheck source=../lib/hook-debug.sh
. "$(dirname "$0")/../lib/hook-debug.sh"
# shellcheck source=../lib/source-session-env.sh
. "$(dirname "$0")/../lib/source-session-env.sh"

_HOOK="pre-tool-use-commit-reminder"

# Fail open without jq.
if ! command -v jq &>/dev/null; then
	hook_error "$_HOOK" "jq not found; skipping"
	emit_noop
	exit 0
fi

input=$(cat)
session_id=$(jq -r '.session_id // ""' <<< "$input")
if [ -n "$session_id" ]; then
	source_session_env "$session_id"
fi

command=$(jq -r '.tool_input.command // empty' <<< "$input")

if [ -z "$command" ]; then
	emit_noop
	exit 0
fi

# Only trigger on commands that start with git commit
# (not commands that mention "git commit" in heredocs or strings).
if [[ ! "$command" =~ ^[[:space:]]*git[[:space:]]+commit ]]; then
	emit_noop
	exit 0
fi

REMINDER="You are about to run a git commit. Consider: does this change introduce user-facing behavior that should be documented in a changeset? Changesets are release documentation — they describe what users upgrading the package need to know. If a changeset is appropriate and one has not been created yet, consider creating one before committing. This is a suggestion, not a requirement — use your judgment.

Changeset files live in .changeset/ with YAML frontmatter declaring packages and bump types. All content must go under ## category headings. Valid ## headings: Breaking Changes, Features, Bug Fixes, Performance, Documentation, Refactoring, Tests, Build System, CI, Dependencies, Maintenance, Reverts, Other. Use ### sub-headings under ## categories for named features."

emit_context "PreToolUse" "$REMINDER"
