# Replace workspace-tools with workspaces-effect

**Date:** 2026-03-29
**Branch:** `feat/silk-effects`

## Goal

Replace the sync `workspace-tools` dependency with Effect services from `workspaces-effect`, completing the migration to the shared Silk Suite library ecosystem.

## Current State

Three source files use `workspace-tools`:

1. **`src/utils/workspace.ts`** -- `Workspace` static class with `detectPackageManager()`, `getChangesetVersionCommand()`, `discoverChangelogs()`. Uses `getWorkspaceInfos` and sync `node:fs`.
2. **`src/utils/version-files.ts`** -- `VersionFiles.discoverVersions()` uses `getWorkspaceInfos` to enumerate workspace packages and their versions.
3. **`src/cli/commands/init.ts`** -- `resolveWorkspaceRoot()` uses `findProjectRoot`.

All three use sync APIs. All callers already run inside `Effect.gen`.

## Design

### Service Replacements

| Current (sync) | Replacement (Effect) | Package |
| ---- | ---- | ---- |
| `Workspace.detectPackageManager(cwd)` | `PackageManagerDetector.detect(root)` | `workspaces-effect` |
| `getWorkspaceInfos(cwd)` | `WorkspaceDiscovery.listPackages()` | `workspaces-effect` |
| `findProjectRoot(cwd)` | `WorkspaceRoot.find(cwd)` | `workspaces-effect` |

### Remove `Workspace` class

The `Workspace` static class is deleted entirely. Its methods are trivial dispatchers:

- `detectPackageManager` -- replaced by `PackageManagerDetector.detect()`
- `getChangesetVersionCommand` -- pure function, moves to `version.ts` as a module-level function
- `discoverChangelogs` -- replaced by `WorkspaceDiscovery.listPackages()` + changelog discovery logic inlined in `version.ts`

### Refactor `VersionFiles.discoverVersions()`

Currently sync, uses `getWorkspaceInfos`. Becomes an Effect that yields `WorkspaceDiscovery`:

```typescript
static discoverVersions(
  cwd: string,
): Effect.Effect<WorkspaceVersion[], never, WorkspaceDiscovery> {
  return Effect.gen(function* () {
    const discovery = yield* WorkspaceDiscovery;
    const packages = yield* discovery.listPackages().pipe(
      Effect.catchAll(() => Effect.succeed([] as const)),
    );
    // Map WorkspacePackage[] to WorkspaceVersion[]
    // Include root if not already present
  });
}
```

Since `processVersionFiles` calls `discoverVersions`, it also becomes effectful. The caller chain `runVersion` -> `processVersionFiles` -> `discoverVersions` is already in `Effect.gen`.

### Update `init.ts`

Replace `resolveWorkspaceRoot(cwd)` (which uses `findProjectRoot`) with:

```typescript
const root = yield* WorkspaceRoot.pipe(
  Effect.flatMap((wr) => wr.find(process.cwd())),
  Effect.catchAll(() => Effect.succeed(process.cwd())),
);
```

### Layer Wiring

Add `WorkspacesLive` from `workspaces-effect` to the CLI entry point:

```typescript
// src/cli/index.ts
import { WorkspacesLive } from "workspaces-effect";

const main = Effect.suspend(() => cli(process.argv)).pipe(
  Effect.provide(WorkspacesLive),
  Effect.provide(NodeContext.layer),
);
```

`WorkspacesLive` provides `WorkspaceDiscovery`, `WorkspaceRoot`, `PackageManagerDetector` (and others). It requires `FileSystem` + `Path`, both provided by `NodeContext.layer`.

### Error Handling

All three replacements preserve current graceful degradation:

- `PackageManagerDetectionError` -> fall back to `"npm"`
- `WorkspaceDiscoveryError` -> fall through to root-only check
- `WorkspaceRootNotFoundError` -> fall back to `cwd`

### Testing

Tests mock `workspaces-effect` at the module level (same pattern as current `workspace-tools` mocks):

```typescript
vi.mock("workspaces-effect", () => ({
  WorkspaceDiscovery: { /* Context.Tag mock */ },
  WorkspaceRoot: { /* Context.Tag mock */ },
  PackageManagerDetector: { /* Context.Tag mock */ },
}));
```

Or provide test layers via `Layer.succeed()`. The approach depends on whether the function under test uses services directly (needs layer) or is called from a command that's mocked at a higher level.

### Dependencies

- Add: `workspaces-effect` (direct dependency, already transitive via silk-effects)
- Remove: `workspace-tools`

## Files Changed

| File | Action |
| ---- | ------ |
| `package/package.json` | Add `workspaces-effect`, remove `workspace-tools` |
| `package/src/utils/workspace.ts` | Delete |
| `package/src/utils/workspace.test.ts` | Delete |
| `package/src/cli/commands/version.ts` | Use services directly, inline changelog discovery and PM command util |
| `package/src/cli/commands/version.test.ts` | Update mocks |
| `package/src/utils/version-files.ts` | `discoverVersions` becomes Effect |
| `package/src/utils/version-files.test.ts` | Update mocks |
| `package/src/cli/commands/init.ts` | Use `WorkspaceRoot.find()` |
| `package/src/cli/commands/init.test.ts` | Update mocks |
| `package/src/cli/index.ts` | Provide `WorkspacesLive` |
| `package/src/index.ts` | Remove Workspace re-exports if any |

## Out of Scope

- Migrating `VersionFiles.processVersionFiles()` sync file I/O to Effect (still uses `readFileSync`/`writeFileSync`)
- `ToolDiscovery` adoption (no CLI tool resolution needed in this package currently)
- Changing the `changeset version` shell command execution pattern
