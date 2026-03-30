---
"@savvy-web/changesets": patch
---

## Bug Fixes

- Fixed session-start hook to output structured JSON with `hookSpecificOutput.additionalContext` instead of raw text, matching the expected hook response format
- Added error trapping and `CLAUDE_PROJECT_DIR` guard for better failure diagnostics
