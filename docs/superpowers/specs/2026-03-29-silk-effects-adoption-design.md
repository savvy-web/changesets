# Adopt silk-effects: Replace Changeset Config Reading

**Date:** 2026-03-29
**Ticket:** #56
**Branch:** `feat/silk-effects`

## Goal

Replace internal changeset config reading in the CLI `version` command with `ChangesetConfigReader` from `@savvy-web/silk-effects/versioning`, aligning this package with the shared Silk conventions library.

## Current State

`VersionFiles.readConfig(cwd)` in `src/utils/version-files.ts` manually:

1. Reads `.changeset/config.json` via `node:fs` + `jsonc-parser`
2. Extracts `changelog[1]` (the formatter options object)
3. Validates the `versionFiles` key via `VersionFilesSchema`

Called from `runVersion()` in `src/cli/commands/version.ts`, which already runs inside `Effect.gen`.

## Design

### Approach

Split `VersionFiles.readConfig()` into two concerns:

- **Config reading** -- delegated to `ChangesetConfigReader` (silk-effects)
- **versionFiles extraction** -- remains local as a pure function

### Changes

#### 1. Add dependencies

- Add `@savvy-web/silk-effects` to `package.json` dependencies (catalog reference).
- Add `jsonc-effect` to `package.json` dependencies (catalog reference).
- Remove `jsonc-parser` from `package.json` dependencies.

#### 2. Refactor `VersionFiles.readConfig()` to `VersionFiles.extractVersionFiles()`

Replace the file-reading method with a pure extraction function:

```typescript
static extractVersionFiles(
  config: ChangesetConfig | SilkChangesetConfig
): readonly VersionFileConfig[] | undefined
```

This function:

- Extracts `changelog[1]` from the config's `changelog` field (which is `string | unknown[]`)
- Validates `versionFiles` from that options object via `VersionFilesSchema`
- Returns the parsed configs or `undefined`

No file I/O, no JSONC parsing -- just extraction + schema validation.

#### 3. Update `runVersion()` in `version.ts`

Wire `ChangesetConfigReader` into the Effect pipeline:

```typescript
// Read config via silk-effects service
const reader = yield* ChangesetConfigReader;
const config = yield* reader.read(cwd).pipe(
  Effect.catchTag("ChangesetConfigError", () => Effect.succeed(undefined))
);

// Extract versionFiles from changelog options (local concern)
const versionFileConfigs = config
  ? VersionFiles.extractVersionFiles(config)
  : undefined;
```

The `ChangesetConfigError` catch handles missing config gracefully (matching current behavior where `readConfig` returns `undefined`).

#### 4. Provide layers in CLI entry point

Add `ChangesetConfigReaderLive` and `NodeContext.layer` to the CLI layer stack in `src/cli/index.ts` or at the command level. Since `ChangesetConfigReaderLive` requires `FileSystem`, `NodeContext.layer` (from `@effect/platform-node`) satisfies it -- already a dependency.

#### 5. Remove replaced code

- Remove `VersionFiles.readConfig()` method
- Remove `jsonc-parser` import from `version-files.ts`
- `jsonc-parser` fully removed from dependencies (replaced by `jsonc-effect` in step 6)

### What stays unchanged

- `VersionFiles.processVersionFiles()`, `resolveGlobs()`, `updateFile()`, `discoverVersions()`, `resolveVersion()` -- unchanged
- `init` command config writing -- out of scope (writes, not reads)
- `validateChangesetOptions()` in `src/schemas/options.ts` -- validates formatter options, not the base config
- All remark/changelog/transform logic -- unaffected

### Testing

- Existing tests for `VersionFiles` cover extraction + processing; update to call `extractVersionFiles()` instead of `readConfig()`
- Existing `version` command tests verify the pipeline; update to provide `ChangesetConfigReaderLive` layer
- Verify `SilkChangesetConfig` detection: `ChangesetConfigReader` sets `_isSilk: true` when `changelog` references `@savvy-web/changesets`
- All 360+ existing tests must continue passing

### Error handling

- `ChangesetConfigError` from silk-effects maps to the existing "return undefined" behavior (config missing or unreadable)
- `versionFiles` schema validation errors continue to warn and return `undefined`

### 6. Replace `jsonc-parser` with `jsonc-effect` in `init.ts`

The `init` command uses `jsonc-parser` for JSONC modification in two functions:

- **`handleBaseMarkdownlint`** -- uses `parseJsonc`, `modify`, `applyEdits` to patch markdownlint config
- **`checkBaseMarkdownlint`** -- uses `parseJsonc` to read and inspect markdownlint config

Replace with `jsonc-effect` equivalents (`parse`, `modify`, `applyEdits`), which return `Effect` values instead of sync. Both functions are already wrapped in `Effect.try`, so the migration converts them to proper `Effect.gen` pipelines.

After this, `jsonc-parser` can be fully removed from dependencies.

The `FormattingOptions` type import changes to `JsoncFormattingOptions` from `jsonc-effect`.

## Out of Scope

- `SilkPublishabilityPlugin` adoption (no publishability checks in this package currently)
- `VersioningStrategy` adoption (no strategy detection needed)
- Converting other sync utilities to Effect services
