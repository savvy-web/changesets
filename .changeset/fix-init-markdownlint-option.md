---
"@savvy-web/changesets": patch
---

## Bug Fixes

- Fixed `init` command never patching or checking the base markdownlint config because `Options.boolean("markdownlint").pipe(Options.withDefault(true))` is a no-op in @effect/cli (boolean options default to `false`, and `withDefault` cannot override this)
- Replaced `--markdownlint` (broken default-true) with `--skip-markdownlint` (correct default-false) so the base config is patched by default
- Removed misleading `withDefault(false)` from other boolean options since it's equally a no-op
