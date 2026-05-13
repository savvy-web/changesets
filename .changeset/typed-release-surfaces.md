---
"@savvy-web/changesets": minor
---

## Features

- Introduce a typed per-package release-surface model in `.changeset/config.json`. The new `packages` field replaces top-level `versionFiles[]` with a record keyed by workspace package name, each carrying `additionalScopes` (extra glob patterns the package owns outside its own directory) and a scoped `versionFiles[]` (each entry now a `{ glob, paths }` tuple). Validated end-to-end by a new `ConfigInspector` Effect service.
- Add a comprehensive CLI surface for config inspection and release-surface classification:
  - `savvy-changesets config show [--json]` / `config validate` — resolve, normalize, and validate the merged config.
  - `savvy-changesets classify <paths...>` — map any path to its owning workspace package via the new `packages` shape plus `additionalScopes`.
  - `savvy-changesets analyze-branch [--base <ref>] [--json]` — diff the working tree (committed + staged + unstaged + untracked) against the base branch's merge-base and classify every changed file into the package(s) it touches, with a structured per-file reason.
  - `savvy-changesets release-surface <package>` — list every glob owned by a given workspace package.
  - `savvy-changesets deps detect` / `deps regen` — compute per-workspace dependency diffs (filtered by publishability) and either emit them as CSH005 markdown / JSON, or delete-and-recreate the project's pure-dependency changesets in lockstep.
- Add a `requireValidConfig` gate in front of every command that operates on a resolved release surface (`transform`, `version`, `classify`, `analyze-branch`, `release-surface`, `deps *`). `lint` and `init` are intentionally exempt so contributors can run them on misconfigured repos.
- Companion Claude Code plugin updates: rename the `changeset-writer` agent to `changeset-manager`, collapse user-invocable skills into a dispatcher pattern that delegates to the agent, add a `dependencies` skill that drives `deps regen`, and wire the agent's create-mode flow through `analyze-branch` so it never invents release-surface exclusions.

## Other

- Soft-deprecate the top-level `versionFiles[]` field on `.changeset/config.json`. The CLI now emits a one-line `[deprecation]` warning on every run that resolves a legacy config, and `config show` surfaces a `legacyVersionFilesUsed: true` flag in its JSON output. Migrate to the per-package `packages` shape — see the new *Migrating from `versionFiles[]`* section in `docs/configuration.md` for a five-step mechanical translation. The legacy shape is removed in 1.0.0; setting both `packages` and the top-level `versionFiles[]` in the same config is already rejected today.
