---
"@savvy-web/changesets": patch
---

## Other

Replace internal changeset config reading with `ChangesetConfigReader` from `@savvy-web/silk-effects` and replace `jsonc-parser` with `jsonc-effect` for Effect-native JSONC operations.

## Dependencies

| Dependency | Type | Action | From | To |
| :--- | :--- | :--- | :--- | :--- |
| @savvy-web/silk-effects | dependency | added | — | ^0.1.0 |
| jsonc-effect | dependency | added | — | ^0.2.1 |
| jsonc-parser | dependency | removed | ^3.3.1 | — |
