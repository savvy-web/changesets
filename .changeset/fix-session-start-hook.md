---
"@savvy-web/changesets": patch
---

## Bug Fixes

- Add missing `hookEventName` field to SessionStart hook JSON output, fixing validation errors
- Consume stdin in SessionStart hook to prevent broken pipe errors
- Convert SessionStart hook `additionalContext` from markdown to XML tags for reliable parsing
