# Silk-Effects Adoption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace internal changeset config reading with `@savvy-web/silk-effects` ChangesetConfigReader and replace `jsonc-parser` with `jsonc-effect` throughout.

**Architecture:** The version command's config reading delegates to `ChangesetConfigReader` (Effect service from silk-effects) instead of doing its own JSONC file I/O. The init command's JSONC modifications switch from sync `jsonc-parser` to effectful `jsonc-effect`. After both migrations, `jsonc-parser` is fully removed.

**Tech Stack:** `@savvy-web/silk-effects@0.1.0`, `jsonc-effect@0.2.1`, Effect-TS, Vitest

**Spec:** `docs/superpowers/specs/2026-03-29-silk-effects-adoption-design.md`

---

## File Map

| File | Action | Purpose |
| ---- | ------ | ------- |
| `package/package.json` | Modify | Add `@savvy-web/silk-effects`, `jsonc-effect`; remove `jsonc-parser` |
| `package/src/utils/version-files.ts` | Modify | Replace `readConfig()` with `extractVersionFiles()` |
| `package/src/utils/version-files.test.ts` | Modify | Update tests for `extractVersionFiles()` |
| `package/src/cli/commands/version.ts` | Modify | Wire `ChangesetConfigReader` service |
| `package/src/cli/commands/version.test.ts` | Modify | Update mock from `readConfig` to `extractVersionFiles` |
| `package/src/cli/commands/init.ts` | Modify | Replace `jsonc-parser` with `jsonc-effect` |
| `package/src/cli/commands/init.test.ts` | Modify | Remove `jsonc-parser` import, update parse calls |

---

### Task 1: Add dependencies

**Files:**

- Modify: `package/package.json`

- [ ] **Step 1: Add `@savvy-web/silk-effects` and `jsonc-effect` to dependencies**

In `package/package.json`, add to the `dependencies` object:

```json
"@savvy-web/silk-effects": "^0.1.0",
"jsonc-effect": "^0.2.1",
```

Keep entries in alphabetical order within the dependencies block.

Do NOT remove `jsonc-parser` yet -- it's still used by `init.ts`. We remove it in Task 6.

- [ ] **Step 2: Install dependencies**

Run: `pnpm install`

Expected: Clean install with no peer dependency warnings for the new packages.

- [ ] **Step 3: Verify the build still works**

Run: `pnpm run build:dev`

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add package/package.json pnpm-lock.yaml
git commit -m "chore(deps): add @savvy-web/silk-effects and jsonc-effect"
```

---

### Task 2: Refactor `VersionFiles.readConfig()` to `extractVersionFiles()`

**Files:**

- Modify: `package/src/utils/version-files.ts`
- Test: `package/src/utils/version-files.test.ts`

- [ ] **Step 1: Write failing tests for `extractVersionFiles()`**

In `package/src/utils/version-files.test.ts`, replace the entire `describe("VersionFiles.readConfig", ...)` block (lines 31-142) with:

```typescript
describe("VersionFiles.extractVersionFiles", () => {
 it("returns undefined when changelog is a plain string", () => {
  const config = { changelog: "@changesets/cli/changelog" };
  expect(VersionFiles.extractVersionFiles(config)).toBeUndefined();
 });

 it("returns undefined when changelog tuple has no options", () => {
  const config = { changelog: ["@savvy-web/changesets/changelog"] as unknown[] };
  expect(VersionFiles.extractVersionFiles(config)).toBeUndefined();
 });

 it("returns undefined when options lack versionFiles", () => {
  const config = {
   changelog: ["@savvy-web/changesets/changelog", { repo: "owner/repo" }] as unknown[],
  };
  expect(VersionFiles.extractVersionFiles(config)).toBeUndefined();
 });

 it("returns undefined for empty versionFiles array", () => {
  const config = {
   changelog: ["@savvy-web/changesets/changelog", { repo: "owner/repo", versionFiles: [] }] as unknown[],
  };
  expect(VersionFiles.extractVersionFiles(config)).toBeUndefined();
 });

 it("parses valid versionFiles config", () => {
  const config = {
   changelog: [
    "@savvy-web/changesets/changelog",
    {
     repo: "owner/repo",
     versionFiles: [{ glob: "plugin.json", paths: ["$.version"] }, { glob: "**/manifest.json" }],
    },
   ] as unknown[],
  };

  const result = VersionFiles.extractVersionFiles(config);
  expect(result).toHaveLength(2);
  expect(result?.[0].glob).toBe("plugin.json");
  expect(result?.[0].paths).toEqual(["$.version"]);
  expect(result?.[1].glob).toBe("**/manifest.json");
  expect(result?.[1].paths).toBeUndefined();
 });

 it("returns undefined when versionFiles fails schema validation", () => {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  const config = {
   changelog: [
    "@savvy-web/changesets/changelog",
    { repo: "owner/repo", versionFiles: [{ glob: "", paths: ["invalid-path"] }] },
   ] as unknown[],
  };
  expect(VersionFiles.extractVersionFiles(config)).toBeUndefined();
  warnSpy.mockRestore();
 });

 it("warns when versionFiles is present but invalid", () => {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  const config = {
   changelog: [
    "@savvy-web/changesets/changelog",
    { repo: "owner/repo", versionFiles: [{ glob: "", paths: ["invalid-path"] }] },
   ] as unknown[],
  };

  expect(VersionFiles.extractVersionFiles(config)).toBeUndefined();
  expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("[changesets] Invalid versionFiles configuration"));
  warnSpy.mockRestore();
 });

 it("returns undefined when changelog is undefined", () => {
  const config = {};
  expect(VersionFiles.extractVersionFiles(config)).toBeUndefined();
 });
});
```

Also remove the `jsonc-parser` import and the `existsSync`/`readFileSync` references from the mocks at the top of the test file -- BUT only if they are not used by other test blocks. Check: `existsSync` and `readFileSync` are still used by `discoverVersions`, `resolveGlobs`, `updateFile`, and `processVersionFiles` tests. So the mock stays but the `jsonc-parser` reference in the `readConfig` test block is gone.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run package/src/utils/version-files.test.ts`

Expected: FAIL -- `VersionFiles.extractVersionFiles is not a function`

- [ ] **Step 3: Implement `extractVersionFiles()` and remove `readConfig()`**

In `package/src/utils/version-files.ts`:

1. Remove the `import { parse as parseJsonc } from "jsonc-parser";` line (line 25).
2. Remove `import { existsSync, readFileSync, writeFileSync } from "node:fs";` -- replace with `import { readFileSync, writeFileSync } from "node:fs";` (existsSync is no longer needed after removing readConfig; readFileSync/writeFileSync are still used by other methods).

   Actually, check: `existsSync` is used by... let me verify. `readConfig` uses `existsSync`. No other method in this file does. So remove `existsSync` from the import.

3. Replace the `readConfig` static method (lines 116-153) with:

```typescript
 /**
  * Extract `versionFiles` config from a parsed changeset config object.
  *
  * @remarks
  * Extracts the `changelog` tuple's second element (options object) and
  * validates the `versionFiles` key against `VersionFilesSchema`. Returns
  * `undefined` if the `changelog` field is not a tuple, the `versionFiles`
  * key is absent, or the array is empty. Schema validation errors are logged
  * as warnings but do not throw.
  *
  * @param config - Parsed changeset config object (from ChangesetConfigReader)
  * @returns Parsed config array, or `undefined` if not configured
  */
 static extractVersionFiles(
  config: { changelog?: string | unknown[] },
 ): readonly VersionFileConfig[] | undefined {
  const { changelog } = config;

  // changelog is expected to be a tuple: [formatter, options]
  if (!Array.isArray(changelog) || changelog.length < 2) {
   return undefined;
  }

  const options = changelog[1] as Record<string, unknown>;
  if (!options || typeof options !== "object" || !("versionFiles" in options)) {
   return undefined;
  }

  // versionFiles key is present — schema errors are now worth reporting
  try {
   const decoded = Schema.decodeUnknownSync(VersionFilesSchema)(options.versionFiles);
   return decoded.length > 0 ? decoded : undefined;
  } catch (error) {
   console.warn(
    `[changesets] Invalid versionFiles configuration: ${error instanceof Error ? error.message : String(error)}`,
   );
   return undefined;
  }
 }
```

1. Also remove the `join` import from `node:path` if it is no longer used. Check: `join` is still used by `discoverVersions` (line 194). Keep it.

2. Update the class TSDoc example to reference `extractVersionFiles` instead of `readConfig`:

```typescript
 * const configs = VersionFiles.extractVersionFiles(parsedConfig);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run package/src/utils/version-files.test.ts`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add package/src/utils/version-files.ts package/src/utils/version-files.test.ts
git commit -m "refactor: replace VersionFiles.readConfig with extractVersionFiles

Extract versionFiles from a pre-parsed config object instead of reading
the file directly. Config reading is delegated to ChangesetConfigReader
from @savvy-web/silk-effects."
```

---

### Task 3: Wire `ChangesetConfigReader` into the version command

**Files:**

- Modify: `package/src/cli/commands/version.ts`
- Modify: `package/src/cli/commands/version.test.ts`

- [ ] **Step 1: Update version command tests**

In `package/src/cli/commands/version.test.ts`:

1. Replace the `vi.mock("../../utils/version-files.js", ...)` block (lines 25-30) with:

```typescript
vi.mock("../../utils/version-files.js", () => ({
 VersionFiles: {
  extractVersionFiles: vi.fn(),
  processVersionFiles: vi.fn(),
 },
}));
```

1. Add a mock for `@savvy-web/silk-effects/versioning` and a test layer. After the existing mocks, add:

```typescript
import { ChangesetConfigReader } from "@savvy-web/silk-effects/versioning";
import { Layer } from "effect";

/**
 * Test layer that provides a no-op ChangesetConfigReader.
 * The version command uses ChangesetConfigReader internally, but our tests
 * mock VersionFiles.extractVersionFiles so the reader result doesn't matter.
 * We provide a reader that returns an empty config to satisfy the service tag.
 */
const TestChangesetConfigReaderLayer = Layer.succeed(ChangesetConfigReader, {
 read: () => Effect.succeed({ changelog: undefined }),
});
```

Then update every `Effect.runPromise(runVersion(...).pipe(Effect.provide(silentLogger)))` call to also provide the test layer:

```typescript
Effect.runPromise(
 runVersion(true).pipe(
  Effect.provide(TestChangesetConfigReaderLayer),
  Effect.provide(silentLogger),
 ),
);
```

Apply this pattern to ALL test cases in the file (there are 10 calls to `runVersion`).

1. Replace all `VersionFiles.readConfig` references with `VersionFiles.extractVersionFiles`:

   - Line 130 test name: `"skips version files when extractVersionFiles returns undefined"`
   - Line 133: `vi.mocked(VersionFiles.extractVersionFiles).mockReturnValue(undefined);`
   - Line 137: `expect(VersionFiles.extractVersionFiles).toHaveBeenCalled();`
   - Line 145: `vi.mocked(VersionFiles.extractVersionFiles).mockReturnValue(configs);`
   - Line 160: `vi.mocked(VersionFiles.extractVersionFiles).mockReturnValue(configs);`
   - Line 171: `vi.mocked(VersionFiles.extractVersionFiles).mockReturnValue([{ glob: "plugin.json" }]);`
   - Line 184: `vi.mocked(VersionFiles.extractVersionFiles).mockReturnValue([{ glob: "plugin.json" }]);`

Note: The tests currently mock the entire module, so `ChangesetConfigReader` usage in the version command is not directly tested here -- the `VersionFiles.extractVersionFiles` mock is what matters. The Effect service is tested via the integration/layer tests.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run package/src/cli/commands/version.test.ts`

Expected: FAIL -- `VersionFiles.extractVersionFiles` is not called (the implementation still calls `readConfig`).

- [ ] **Step 3: Update the version command implementation**

In `package/src/cli/commands/version.ts`:

1. Add imports at the top:

```typescript
import { ChangesetConfigReader, ChangesetConfigReaderLive } from "@savvy-web/silk-effects/versioning";
import { NodeContext } from "@effect/platform-node";
```

1. Replace lines 100-118 (the version files section) with:

```typescript
  // 5. Update version files (if configured)
  const configResult = yield* ChangesetConfigReader.pipe(
   Effect.flatMap((reader) => reader.read(cwd)),
   Effect.map((config) => VersionFiles.extractVersionFiles(config)),
   Effect.catchAll(() => Effect.succeed(undefined)),
  );
  if (configResult) {
   yield* Effect.log(`Found ${configResult.length} versionFiles config(s)`);
   const updates = yield* Effect.try({
    try: () => VersionFiles.processVersionFiles(cwd, configResult, dryRun),
    catch: (error) => {
     const message = error instanceof Error ? error.message : String(error);
     return new VersionFileError({
      filePath: message.match(/Failed to update (.+?):/)?.[1] ?? cwd,
      reason: message,
     });
    },
   });
   for (const update of updates) {
    const action = dryRun ? "Would update" : "Updated";
    yield* Effect.log(`${action} ${update.filePath} → ${update.version}`);
   }
  }
```

1. The `runVersion` function's return type now requires `ChangesetConfigReader` in its context. Since the function is called from the command handler which provides `NodeContext.layer` via `runCli()`, we need to provide `ChangesetConfigReaderLive` at the command level.

Update the `versionCommand` definition (bottom of file) to provide the layer:

```typescript
export const versionCommand = Command.make("version", { dryRun: dryRunOption }, ({ dryRun }) =>
 runVersion(dryRun).pipe(
  Effect.provide(ChangesetConfigReaderLive),
 ),
).pipe(Command.withDescription("Run changeset version and transform all CHANGELOGs"));
```

Since `ChangesetConfigReaderLive` requires `FileSystem.FileSystem`, and `NodeContext.layer` (provided in `cli/index.ts`) satisfies that, this will work.

1. Remove the unused import: the `VersionFiles` import is still needed for `extractVersionFiles` and `processVersionFiles`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run package/src/cli/commands/version.test.ts`

Expected: All tests PASS. The tests mock `VersionFiles` so the `ChangesetConfigReader` Effect service is not invoked in unit tests.

- [ ] **Step 5: Run all tests to check for regressions**

Run: `pnpm vitest run`

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add package/src/cli/commands/version.ts package/src/cli/commands/version.test.ts
git commit -m "refactor: wire ChangesetConfigReader into version command

Replace direct config file reading with ChangesetConfigReader from
@savvy-web/silk-effects. The service reads and decodes .changeset/config.json,
then extractVersionFiles pulls versionFiles from the changelog options."
```

---

### Task 4: Replace `jsonc-parser` with `jsonc-effect` in `handleBaseMarkdownlint`

**Files:**

- Modify: `package/src/cli/commands/init.ts`
- Modify: `package/src/cli/commands/init.test.ts`

- [ ] **Step 1: Update `handleBaseMarkdownlint` implementation**

In `package/src/cli/commands/init.ts`:

1. Replace the import (lines 40-41):

```typescript
import type { FormattingOptions } from "jsonc-parser";
import { applyEdits, modify, parse as parseJsonc } from "jsonc-parser";
```

with:

```typescript
import { type JsoncFormattingOptions, applyEdits, modify, parse as parseJsonc } from "jsonc-effect";
```

1. Replace the `JSONC_FORMAT` constant (lines 151-154):

```typescript
const JSONC_FORMAT: FormattingOptions = {
 tabSize: 1,
 insertSpaces: false,
};
```

with:

```typescript
const JSONC_FORMAT: Partial<JsoncFormattingOptions> = {
 tabSize: 1,
 insertSpaces: false,
};
```

1. Replace the `handleBaseMarkdownlint` function body (lines 271-319). The function currently wraps everything in `Effect.try`. Since `jsonc-effect`'s `parse`, `modify`, and `applyEdits` all return `Effect`, the function becomes an `Effect.gen`:

```typescript
export function handleBaseMarkdownlint(root: string): Effect.Effect<string, InitError> {
 const foundPath = findMarkdownlintConfig(root);
 if (!foundPath) {
  return Effect.succeed(
   `Warning: no markdownlint config found (checked ${MARKDOWNLINT_CONFIG_PATHS.join(", ")})`,
  );
 }

 return Effect.gen(function* () {
  const fullPath = join(root, foundPath);
  let text: string;
  try {
   text = readFileSync(fullPath, "utf-8");
  } catch (error) {
   return yield* Effect.fail(
    new InitError({
     step: "markdownlint config",
     reason: error instanceof Error ? error.message : String(error),
    }),
   );
  }

  let parsed = (yield* parseJsonc(text)) as Record<string, unknown>;

  // Add customRules entry if missing
  if (!Array.isArray(parsed.customRules) || !(parsed.customRules as string[]).includes(CUSTOM_RULES_ENTRY)) {
   const currentArray = Array.isArray(parsed.customRules) ? (parsed.customRules as unknown[]) : [];
   const edits = yield* modify(text, ["customRules", currentArray.length], CUSTOM_RULES_ENTRY, {
    formattingOptions: JSONC_FORMAT,
   });
   text = yield* applyEdits(text, edits);
  }

  // Ensure config is an object (replace null/missing with {})
  parsed = (yield* parseJsonc(text)) as Record<string, unknown>;
  const currentConfig = parsed.config;
  if (typeof currentConfig !== "object" || currentConfig === null) {
   const edits = yield* modify(text, ["config"], {}, { formattingOptions: JSONC_FORMAT });
   text = yield* applyEdits(text, edits);
  }

  // Add missing rule entries
  parsed = (yield* parseJsonc(text)) as Record<string, unknown>;
  const config = parsed.config as Record<string, unknown>;
  for (const rule of RULE_NAMES) {
   if (!(rule in config)) {
    const edits = yield* modify(text, ["config", rule], false, {
     formattingOptions: JSONC_FORMAT,
    });
    text = yield* applyEdits(text, edits);
   }
  }

  try {
   writeFileSync(fullPath, text);
  } catch (error) {
   return yield* Effect.fail(
    new InitError({
     step: "markdownlint config",
     reason: error instanceof Error ? error.message : String(error),
    }),
   );
  }
  return `Updated ${foundPath}`;
 }).pipe(
  Effect.catchAll((error) => {
   if (error instanceof InitError) return Effect.fail(error);
   return Effect.fail(
    new InitError({
     step: "markdownlint config",
     reason: error instanceof Error ? error.message : String(error),
    }),
   );
  }),
 );
}
```

Key differences from the old implementation:

- `parseJsonc(text)` returns `Effect<unknown, JsoncParseError>` instead of a sync value
- `modify(text, path, value, opts)` returns `Effect<edits, JsoncModificationError>` instead of sync edits
- `applyEdits(text, edits)` returns `Effect<string>` instead of a sync string
- Array insertion uses index `currentArray.length` instead of `-1` with `isArrayInsertion`

- [ ] **Step 2: Update `checkBaseMarkdownlint` to use `jsonc-effect`**

Replace the `checkBaseMarkdownlint` function (lines 459-498):

```typescript
export function checkBaseMarkdownlint(root: string): CheckIssue[] {
 const foundPath = findMarkdownlintConfig(root);
 if (!foundPath) {
  return [{ file: "markdownlint config", message: `not found (checked ${MARKDOWNLINT_CONFIG_PATHS.join(", ")})` }];
 }

 try {
  const raw = readFileSync(join(root, foundPath), "utf-8");
  const parsed = Effect.runSync(parseJsonc(raw)) as Record<string, unknown>;
  const issues: CheckIssue[] = [];

  if (!Array.isArray(parsed.customRules) || !(parsed.customRules as string[]).includes(CUSTOM_RULES_ENTRY)) {
   issues.push({
    file: foundPath,
    message: `customRules does not include ${CUSTOM_RULES_ENTRY}`,
   });
  }

  const config = parsed.config;
  if (typeof config !== "object" || config === null) {
   issues.push({
    file: foundPath,
    message: "config section is missing",
   });
  } else {
   for (const rule of RULE_NAMES) {
    if (!(rule in (config as Record<string, unknown>))) {
     issues.push({
      file: foundPath,
      message: `rule "${rule}" is not configured`,
     });
    }
   }
  }

  return issues;
 } catch {
  return [{ file: foundPath, message: "could not parse file" }];
 }
}
```

The only change here is `parseJsonc(raw)` now returns an Effect, so wrap with `Effect.runSync()`. Since `checkBaseMarkdownlint` is a sync function (returns `CheckIssue[]`), this is the simplest approach. The existing `try/catch` will catch any `JsoncParseError` thrown by `Effect.runSync`.

- [ ] **Step 3: Update test imports**

In `package/src/cli/commands/init.test.ts`:

Replace line 5:

```typescript
import { parse as parseJsonc } from "jsonc-parser";
```

with:

```typescript
import { Effect } from "effect";
import { parse as parseJsonc } from "jsonc-effect";
```

Then update all test assertions that use `parseJsonc(getWritten(...))` to use `Effect.runSync(parseJsonc(getWritten(...)))`. These appear in the `handleBaseMarkdownlint` tests:

- Line 332: `const parsed = Effect.runSync(parseJsonc(getWritten(calls, 0)));`
- Line 355: `const parsed = Effect.runSync(parseJsonc(getWritten(calls, 0)));`
- Line 373: `const parsed = Effect.runSync(parseJsonc(getWritten(calls, 0)));`
- Line 391: `const parsed = Effect.runSync(parseJsonc(getWritten(calls, 0)));`
- Line 418: `const parsed = Effect.runSync(parseJsonc(getWritten(calls, 0)));`
- Line 440: `const parsed = Effect.runSync(parseJsonc(getWritten(calls, 0)));`
- Line 468: `const parsed = Effect.runSync(parseJsonc(written));`

Note: `Effect` is already imported in `init.test.ts` (line 4). So just add the `parseJsonc` import from `jsonc-effect` and update the calls.

Wait -- the test file already imports `Effect` from `"effect"` on line 4. Check: yes, line 4 is `import { Effect } from "effect";`. So just change the `parseJsonc` import source.

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run package/src/cli/commands/init.test.ts`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add package/src/cli/commands/init.ts package/src/cli/commands/init.test.ts
git commit -m "refactor: replace jsonc-parser with jsonc-effect in init command

Migrate handleBaseMarkdownlint and checkBaseMarkdownlint to use
jsonc-effect's Effect-returning parse/modify/applyEdits APIs."
```

---

### Task 5: Run full test suite and typecheck

**Files:** None (verification only)

- [ ] **Step 1: Run typecheck**

Run: `pnpm run typecheck`

Expected: No type errors.

- [ ] **Step 2: Run full test suite**

Run: `pnpm vitest run`

Expected: All 360+ tests pass.

- [ ] **Step 3: Run lint**

Run: `pnpm run lint`

Expected: No lint errors.

---

### Task 6: Remove `jsonc-parser` dependency

**Files:**

- Modify: `package/package.json`

- [ ] **Step 1: Verify no remaining references to `jsonc-parser`**

Run: `grep -r "jsonc-parser" package/src/`

Expected: No matches (all usages have been replaced).

- [ ] **Step 2: Remove `jsonc-parser` from dependencies**

In `package/package.json`, remove the line:

```json
"jsonc-parser": "^3.3.1",
```

- [ ] **Step 3: Reinstall**

Run: `pnpm install`

Expected: Clean install, lockfile updated.

- [ ] **Step 4: Run full test suite to confirm nothing broke**

Run: `pnpm vitest run`

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add package/package.json pnpm-lock.yaml
git commit -m "chore(deps): remove jsonc-parser, fully replaced by jsonc-effect"
```

---

### Task 7: Final verification and cleanup

**Files:** None (verification only)

- [ ] **Step 1: Run build**

Run: `pnpm run build`

Expected: Both dev and prod builds succeed.

- [ ] **Step 2: Run full test suite with coverage**

Run: `pnpm run test:coverage`

Expected: All tests pass. Coverage thresholds met (85% lines/branches/statements, 80% functions).

- [ ] **Step 3: Run lint**

Run: `pnpm run lint`

Expected: No errors.

- [ ] **Step 4: Verify SilkChangesetConfig detection**

This is covered by the existing integration tests and by the ChangesetConfigReader's own test suite in silk-effects. The version command now delegates config reading to the service, which automatically sets `_isSilk: true` when the changelog field references `@savvy-web/changesets`.
