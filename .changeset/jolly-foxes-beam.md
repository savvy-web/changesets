---
"@savvy-web/changesets": patch
---

## Features

- Add `--check` flag to `init` command for read-only config inspection, suitable
  for postinstall scripts (always exits 0, logs warnings for out-of-date config)
- Search for markdownlint config in multiple locations:
  `lib/configs/.markdownlint-cli2.jsonc`, `lib/configs/.markdownlint-cli2.json`,
  `.markdownlint-cli2.jsonc`, `.markdownlint-cli2.json` (first match wins)
- Warn when no markdownlint config file is found instead of silently skipping
- Dual-format (ESM + CJS) build exports

## Bug Fixes

- Fix markdownlint exports to match markdownlint-cli2 expectations
- Manage `customRules` property in markdownlint-cli2 config file during init
