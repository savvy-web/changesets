#!/usr/bin/env bash
set -euo pipefail

# SessionEnd hook: validate all changeset files in .changeset/ directory.
# Runs the full check command to catch any issues before the session closes.

# Skip if no .changeset directory exists
if [ ! -d "$CLAUDE_PROJECT_DIR/.changeset" ]; then
  exit 0
fi

# Skip if no .md files in .changeset/ (only config.json)
shopt -s nullglob
md_files=("$CLAUDE_PROJECT_DIR"/.changeset/*.md)
shopt -u nullglob
if [ ${#md_files[@]} -eq 0 ]; then
  exit 0
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
  pnpm) cmd="pnpm exec savvy-changesets" ;;
  yarn) cmd="yarn exec savvy-changesets" ;;
  bun)  cmd="bunx savvy-changesets" ;;
  *)    cmd="npx --no -- savvy-changesets" ;;
esac

# Skip if CLI is not available (e.g., after failed install/build)
if ! command -v savvy-changesets &>/dev/null && ! $cmd --version &>/dev/null; then
  exit 0
fi

if ! result=$($cmd check "$CLAUDE_PROJECT_DIR/.changeset" 2>&1); then
  echo "$result" >&2
  exit 2
fi

exit 0
