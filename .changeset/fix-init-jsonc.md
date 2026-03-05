---
"@savvy-web/changesets": patch
---

## Bug Fixes

- Fixed `init` command destroying JSONC comments and formatting when patching markdownlint config files by switching from regex-based comment stripping + `JSON.stringify` to `jsonc-parser`'s `modify` + `applyEdits` for surgical edits
