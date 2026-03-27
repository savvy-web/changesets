---
"@savvy-web/changesets": patch
---

## Bug Fixes

Plugin hooks no longer block tool calls or prevent Claude from stopping. All hooks now return structured JSON with `additionalContext` instead of using `exit 2` error codes.

* Pre-commit reminder provides context instead of blocking `git commit`
* Changeset validation returns errors as context instead of failing the hook
* Removed redundant Stop hook that prevented Claude from finishing
* Narrowed SessionStart matcher to `startup` only (skip on resume/clear/compact)
