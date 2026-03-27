#!/usr/bin/env bash
set -uo pipefail

# PostToolUse hook: validate changeset files after Write|Edit.
# Reads hook input JSON from stdin, checks if the file is a changeset,
# and runs the savvy-changesets CLI to validate it.
# Returns structured JSON — never exits with error codes.

input=$(cat)

file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

if [[ -z "$file_path" ]]; then
  exit 0
fi

# Only validate .md files directly inside a .changeset/ directory
if [[ ! "$file_path" =~ \.changeset/[^/]+\.md$ ]]; then
  exit 0
fi

# Detect package manager
detect_pm() {
  local root="${CLAUDE_PROJECT_DIR:-}"
  if [[ -z "$root" ]]; then
    echo "npm"
    return
  fi
  if [[ -f "$root/package.json" ]]; then
    local pm
    pm=$(jq -r '.packageManager // empty' "$root/package.json" 2>/dev/null | cut -d'@' -f1)
    if [[ -n "$pm" ]]; then
      echo "$pm"
      return
    fi
  fi
  if [[ -f "$root/pnpm-lock.yaml" ]]; then
    echo "pnpm"
  elif [[ -f "$root/yarn.lock" ]]; then
    echo "yarn"
  elif [[ -f "$root/bun.lock" ]]; then
    echo "bun"
  else
    echo "npm"
  fi
}

PM=$(detect_pm)

case "$PM" in
  pnpm) cmd="pnpm exec savvy-changesets" ;;
  yarn) cmd="yarn exec savvy-changesets" ;;
  bun)  cmd="bunx savvy-changesets" ;;
  *)    cmd="npx --no -- savvy-changesets" ;;
esac

# Skip if CLI is not available
if ! $cmd --version &>/dev/null; then
  exit 0
fi

result=$($cmd validate-file "$file_path" 2>&1)
validate_exit=$?

if [[ $validate_exit -ne 0 ]]; then
  jq -n --arg errors "$result" '{
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: ("Changeset validation found issues. Please fix before proceeding:\n" + $errors)
    }
  }'
  exit 0
fi

exit 0
