---
"@savvy-web/changesets": patch
---

## Other

Adopt shared Silk Suite libraries, replacing internal implementations with Effect services:

- Replace changeset config reading with `ChangesetConfigReader` from `@savvy-web/silk-effects`
- Replace `jsonc-parser` with `jsonc-effect` for Effect-native JSONC operations
- Replace `workspace-tools` with `workspaces-effect` Effect services (`WorkspaceDiscovery`, `PackageManagerDetector`, `WorkspaceRoot`)
- Delete `Workspace` static utility class

## Dependencies

| Dependency | Type | Action | From | To |
| :--- | :--- | :--- | :--- | :--- |
| @savvy-web/silk-effects | dependency | added | — | ^0.2.0 |
| jsonc-effect | dependency | added | — | ^0.2.1 |
| workspaces-effect | dependency | added | — | ^0.1.0 |
| jsonc-parser | dependency | removed | ^3.3.1 | — |
| workspace-tools | dependency | removed | 0.41.0 | — |
