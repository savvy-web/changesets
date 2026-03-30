# Workspaces-Effect Adoption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `workspace-tools` with Effect services from `workspaces-effect` for workspace discovery, package manager detection, and workspace root finding.

**Architecture:** Delete the `Workspace` static class. Inline `getChangesetVersionCommand` as a local util in `version.ts`. Use `PackageManagerDetector`, `WorkspaceDiscovery`, and `WorkspaceRoot` services directly in commands. Refactor `VersionFiles.discoverVersions` to accept pre-resolved workspace data instead of doing its own discovery. Provide `WorkspacesLive` layer at the CLI entry point.

**Tech Stack:** `workspaces-effect`, Effect-TS, `@effect/platform-node`, Vitest

**Spec:** `docs/superpowers/specs/2026-03-29-workspaces-effect-adoption-design.md`

---

## File Map

| File | Action | Purpose |
| ---- | ------ | ------- |
| `package/package.json` | Modify | Add `workspaces-effect`, remove `workspace-tools` |
| `package/src/utils/workspace.ts` | Delete | Replaced by direct service usage |
| `package/src/utils/workspace.test.ts` | Delete | Tests move to command-level |
| `package/src/cli/commands/version.ts` | Modify | Use services directly, inline PM command util |
| `package/src/cli/commands/version.test.ts` | Modify | Provide test layers for workspace services |
| `package/src/utils/version-files.ts` | Modify | `discoverVersions` accepts packages param |
| `package/src/utils/version-files.test.ts` | Modify | Remove `workspace-tools` mock |
| `package/src/cli/commands/init.ts` | Modify | Use `WorkspaceRoot.find()` |
| `package/src/cli/commands/init.test.ts` | Modify | Provide test layer for `WorkspaceRoot` |
| `package/src/cli/index.ts` | Modify | Provide `WorkspacesLive` layer |

---

### Task 1: Add `workspaces-effect` dependency

**Files:**

- Modify: `package/package.json`

- [ ] **Step 1: Add dependency and remove old one**

In `package/package.json`, add `workspaces-effect` and remove `workspace-tools` from `dependencies`:

```json
"workspaces-effect": "^0.1.0",
```

Remove:

```json
"workspace-tools": "0.41.0"
```

Keep entries in alphabetical order.

- [ ] **Step 2: Install**

Run: `pnpm install`

Expected: Clean install. `workspaces-effect` is already a transitive dep via silk-effects, so no new packages should be added.

- [ ] **Step 3: Commit**

```bash
git add package/package.json pnpm-lock.yaml
git commit -m "chore(deps): add workspaces-effect, remove workspace-tools"
```

---

### Task 2: Refactor `VersionFiles.discoverVersions` to accept packages

**Files:**

- Modify: `package/src/utils/version-files.ts`
- Modify: `package/src/utils/version-files.test.ts`

The key insight: instead of making `discoverVersions` effectful (which would cascade to `processVersionFiles`), refactor it to accept an array of workspace packages as a parameter. The caller (version command) resolves packages via `WorkspaceDiscovery` and passes them in.

- [ ] **Step 1: Update tests for new `discoverVersions` signature**

In `package/src/utils/version-files.test.ts`, the `discoverVersions` tests currently mock `getWorkspaceInfos` and `readFileSync`. Replace them to test with direct data input.

The new signature is:

```typescript
static discoverVersions(
  cwd: string,
  packages: ReadonlyArray<{ name: string; version: string; path: string }>,
): WorkspaceVersion[]
```

Replace the `describe("VersionFiles.discoverVersions", ...)` block. Remove the `workspace-tools` mock entirely (it's no longer imported). Remove the `getWorkspaceInfos` import. Remove the `createMockWorkspace` helper.

New tests:

```typescript
describe("VersionFiles.discoverVersions", () => {
 it("maps workspace packages to versions", () => {
  const packages = [
   { name: "pkg-a", version: "1.0.0", path: "/project/packages/a" },
   { name: "pkg-b", version: "2.0.0", path: "/project/packages/b" },
  ];

  const result = VersionFiles.discoverVersions("/project", packages);

  expect(result).toHaveLength(2);
  expect(result[0]).toEqual({ name: "pkg-a", path: "/project/packages/a", version: "1.0.0" });
  expect(result[1]).toEqual({ name: "pkg-b", path: "/project/packages/b", version: "2.0.0" });
 });

 it("includes root when not in packages list", () => {
  vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ name: "root-pkg", version: "3.0.0" }));

  const result = VersionFiles.discoverVersions("/project", []);

  expect(result).toHaveLength(1);
  expect(result[0]).toEqual({ name: "root-pkg", path: resolve("/project"), version: "3.0.0" });
 });

 it("deduplicates root when it appears in packages", () => {
  const resolvedCwd = resolve("/project");
  const packages = [
   { name: "my-pkg", version: "1.0.0", path: resolvedCwd },
  ];

  const result = VersionFiles.discoverVersions("/project", packages);

  expect(result).toHaveLength(1);
  expect(result[0]?.name).toBe("my-pkg");
 });

 it("skips packages without a version", () => {
  const packages = [
   { name: "pkg-a", version: "1.0.0", path: "/project/packages/a" },
   { name: "pkg-b", version: "", path: "/project/packages/b" },
  ];

  const result = VersionFiles.discoverVersions("/project", packages);

  expect(result).toHaveLength(1);
  expect(result[0]?.name).toBe("pkg-a");
 });

 it("uses 'root' as name when root package.json is unreadable", () => {
  vi.mocked(readFileSync).mockImplementation(() => {
   throw new Error("ENOENT");
  });

  const result = VersionFiles.discoverVersions("/project", []);

  expect(result).toHaveLength(0);
 });
});
```

Also update the `processVersionFiles` tests — they currently mock `VersionFiles.discoverVersions` as a no-arg call. No change needed there since `processVersionFiles` will still call `discoverVersions` internally (we handle this in Task 4).

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run package/src/utils/version-files.test.ts`

Expected: FAIL — `discoverVersions` still has old signature.

- [ ] **Step 3: Implement new `discoverVersions`**

In `package/src/utils/version-files.ts`:

1. Remove the imports:

```typescript
import type { WorkspaceInfos } from "workspace-tools";
import { getWorkspaceInfos } from "workspace-tools";
```

1. Replace the `discoverVersions` method:

```typescript
 /**
  * Build workspace version list from pre-resolved packages.
  *
  * @remarks
  * Maps workspace packages to `WorkspaceVersion` entries. The root package
  * is always included if not already present. Deduplicates by absolute path.
  *
  * @param cwd - Project root directory
  * @param packages - Pre-resolved workspace packages (from WorkspaceDiscovery)
  * @returns Array of workspace packages with versions
  */
 static discoverVersions(
  cwd: string,
  packages: ReadonlyArray<{ name: string; version: string; path: string }>,
 ): WorkspaceVersion[] {
  const resolvedCwd = resolve(cwd);
  const results: WorkspaceVersion[] = [];
  const seen = new Set<string>();

  for (const pkg of packages) {
   if (seen.has(pkg.path) || !pkg.version) continue;
   seen.add(pkg.path);
   results.push({ name: pkg.name, path: pkg.path, version: pkg.version });
  }

  // Always include root if not already present
  if (!seen.has(resolvedCwd)) {
   const version = readPackageVersion(resolvedCwd);
   if (version) {
    let rootName = "root";
    try {
     const pkg = JSON.parse(readFileSync(join(resolvedCwd, "package.json"), "utf-8")) as {
      name?: string;
     };
     if (pkg.name) rootName = pkg.name;
    } catch {
     // Use default name
    }
    results.push({ name: rootName, path: resolvedCwd, version });
   }
  }

  return results;
 }
```

1. Remove `readPackageVersion` function only if it's no longer used. Check: it's still used by the root-package fallback path above. Keep it.

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run package/src/utils/version-files.test.ts`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add package/src/utils/version-files.ts package/src/utils/version-files.test.ts
git commit -m "refactor: VersionFiles.discoverVersions accepts packages param

Accept pre-resolved workspace packages instead of calling workspace-tools
internally. Caller resolves via WorkspaceDiscovery."
```

---

### Task 3: Rewrite `version.ts` to use workspace services

**Files:**

- Modify: `package/src/cli/commands/version.ts`
- Modify: `package/src/cli/commands/version.test.ts`

- [ ] **Step 1: Rewrite `version.ts`**

Replace the full file content of `package/src/cli/commands/version.ts`:

1. Remove imports of `Workspace` from `../../utils/workspace.js`.
2. Add imports:

```typescript
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PackageManagerDetector, WorkspaceDiscovery } from "workspaces-effect";
```

1. Add the `getChangesetVersionCommand` utility function (moved from `Workspace` class):

```typescript
type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

function getChangesetVersionCommand(pm: PackageManager): string {
 switch (pm) {
  case "pnpm":
   return "pnpm exec changeset version";
  case "yarn":
   return "yarn exec changeset version";
  case "bun":
   return "bun x changeset version";
  default:
   return "npx changeset version";
 }
}
```

1. Rewrite `runVersion` body:

```typescript
export function runVersion(dryRun: boolean) {
 return Effect.gen(function* () {
  const cwd = process.cwd();

  // 1. Detect package manager
  const detector = yield* PackageManagerDetector;
  const detected = yield* detector.detect(cwd).pipe(
   Effect.catchAll(() => Effect.succeed({ type: "npm" as const, version: undefined })),
  );
  const pm = detected.type;
  yield* Effect.log(`Detected package manager: ${pm}`);

  // 2. Run changeset version (unless --dry-run)
  if (!dryRun) {
   const cmd = getChangesetVersionCommand(pm);
   yield* Effect.log(`Running: ${cmd}`);
   yield* Effect.try({
    try: () => execSync(cmd, { cwd, stdio: "inherit" }),
    catch: (error) =>
     new Error(`changeset version failed: ${error instanceof Error ? error.message : String(error)}`),
   });
  } else {
   yield* Effect.log("Dry run: skipping changeset version");
  }

  // 3. Discover all CHANGELOG.md files
  const discovery = yield* WorkspaceDiscovery;
  const packages = yield* discovery.listPackages().pipe(
   Effect.catchAll(() => Effect.succeed([] as const)),
  );

  const changelogs: Array<{ name: string; path: string; changelogPath: string }> = [];
  const seen = new Set<string>();

  for (const pkg of packages) {
   const changelogPath = join(pkg.path, "CHANGELOG.md");
   if (existsSync(changelogPath) && !seen.has(pkg.path)) {
    seen.add(pkg.path);
    changelogs.push({ name: pkg.name, path: pkg.path, changelogPath });
   }
  }

  // Include root if not already found as a workspace entry
  const resolvedCwd = join(cwd);
  if (!seen.has(resolvedCwd)) {
   const rootChangelog = join(resolvedCwd, "CHANGELOG.md");
   if (existsSync(rootChangelog)) {
    let rootName = "root";
    try {
     const pkg = JSON.parse(
      (await import("node:fs")).readFileSync(join(resolvedCwd, "package.json"), "utf-8"),
     ) as { name?: string };
     if (pkg.name) rootName = pkg.name;
    } catch {
     // Use default name
    }
    changelogs.push({ name: rootName, path: resolvedCwd, changelogPath: rootChangelog });
   }
  }

  if (changelogs.length === 0) {
   yield* Effect.log("No CHANGELOG.md files found.");
  } else {
   yield* Effect.log(`Found ${changelogs.length} CHANGELOG.md file(s)`);

   // 4. Transform each changelog
   for (const entry of changelogs) {
    yield* Effect.try({
     try: () => ChangelogTransformer.transformFile(entry.changelogPath),
     catch: (error) =>
      new Error(
       `Failed to transform ${entry.changelogPath}: ${error instanceof Error ? error.message : String(error)}`,
      ),
    });
    yield* Effect.log(`Transformed ${entry.name} → ${entry.changelogPath}`);
   }
  }

  // 5. Update version files (if configured)
  const configResult = yield* ChangesetConfigReader.pipe(
   Effect.flatMap((reader) => reader.read(cwd)),
   Effect.map((config) => VersionFiles.extractVersionFiles(config)),
   Effect.catchAll(() => Effect.succeed(undefined)),
  );
  if (configResult) {
   yield* Effect.log(`Found ${configResult.length} versionFiles config(s)`);
   const workspaceVersions = packages.map((pkg) => ({
    name: pkg.name,
    version: pkg.version,
    path: pkg.path,
   }));
   const updates = yield* Effect.try({
    try: () => VersionFiles.processVersionFiles(cwd, configResult, dryRun, workspaceVersions),
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
 });
}
```

Wait — using `await import("node:fs")` inside `Effect.gen` is incorrect. Use a direct `readFileSync` import instead. Let me fix that. The `readFileSync` is already imported via `node:fs` at the top. Actually, looking at the current version.ts, it doesn't import `node:fs` anymore (we removed it in Task 3 of the previous plan). So add it back:

```typescript
import { existsSync, readFileSync } from "node:fs";
```

And the root name detection becomes:

```typescript
if (!seen.has(resolvedCwd)) {
 const rootChangelog = join(resolvedCwd, "CHANGELOG.md");
 if (existsSync(rootChangelog)) {
  let rootName = "root";
  try {
   const pkg = JSON.parse(readFileSync(join(resolvedCwd, "package.json"), "utf-8")) as {
    name?: string;
   };
   if (pkg.name) rootName = pkg.name;
  } catch {
   // Use default name
  }
  changelogs.push({ name: rootName, path: resolvedCwd, changelogPath: rootChangelog });
 }
}
```

1. Update `processVersionFiles` call to pass workspace packages:

The `processVersionFiles` signature changes to accept an optional `packages` parameter. Update the call:

```typescript
try: () => VersionFiles.processVersionFiles(cwd, configResult, dryRun, workspaceVersions),
```

This requires updating `processVersionFiles` in Task 4.

- [ ] **Step 2: Update `processVersionFiles` to accept packages**

In `package/src/utils/version-files.ts`, update `processVersionFiles` to pass packages through to `discoverVersions`:

```typescript
static processVersionFiles(
 cwd: string,
 configs: readonly VersionFileConfig[],
 dryRun = false,
 packages: ReadonlyArray<{ name: string; version: string; path: string }> = [],
): VersionFileUpdate[] {
 const workspaces = VersionFiles.discoverVersions(cwd, packages);
```

The rest stays the same.

- [ ] **Step 3: Update version tests**

In `package/src/cli/commands/version.test.ts`:

1. Remove the `Workspace` mock and import:

```typescript
// DELETE these:
vi.mock("../../utils/workspace.js", () => ({
 Workspace: {
  detectPackageManager: vi.fn(),
  getChangesetVersionCommand: vi.fn(),
  discoverChangelogs: vi.fn(),
 },
}));
import { Workspace } from "../../utils/workspace.js";
```

1. Add workspace service mocks:

```typescript
import { PackageManagerDetector, WorkspaceDiscovery } from "workspaces-effect";

const TestWorkspaceLayer = Layer.mergeAll(
 Layer.succeed(PackageManagerDetector, {
  detect: () => Effect.succeed({ type: "pnpm" as const, version: "10.0.0" }),
 }),
 Layer.succeed(WorkspaceDiscovery, {
  listPackages: () => Effect.succeed([]),
  getPackage: () => Effect.fail({ _tag: "PackageNotFoundError" as const, name: "", reason: "" }),
  importerMap: () => Effect.succeed(new Map()),
 }),
);
```

1. Update every test to provide `TestWorkspaceLayer` alongside `TestChangesetConfigReaderLayer`:

```typescript
Effect.runPromise(
 runVersion(true).pipe(
  Effect.provide(TestChangesetConfigReaderLayer),
  Effect.provide(TestWorkspaceLayer),
  Effect.provide(silentLogger),
 ),
);
```

1. For tests that need specific PM detection or workspace packages, create per-test layers:

```typescript
// For "runs execSync with changeset version command" test:
const pnpmLayer = Layer.succeed(PackageManagerDetector, {
 detect: () => Effect.succeed({ type: "pnpm" as const, version: "10.0.0" }),
});
```

1. For changelog discovery tests, configure `WorkspaceDiscovery.listPackages` to return mock packages. The test must also mock `existsSync` for CHANGELOG.md checks:

```typescript
vi.mock("node:fs", () => ({
 existsSync: vi.fn(),
 readFileSync: vi.fn(),
}));
```

1. Update assertions: instead of `expect(Workspace.detectPackageManager).toHaveBeenCalledWith(cwd)`, assert on the detected PM via the Effect output (command execution).

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run package/src/cli/commands/version.test.ts`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add package/src/cli/commands/version.ts package/src/cli/commands/version.test.ts package/src/utils/version-files.ts
git commit -m "refactor: replace Workspace class with workspaces-effect services in version command

Use PackageManagerDetector and WorkspaceDiscovery services directly.
Inline getChangesetVersionCommand as local utility. Pass workspace
packages to VersionFiles.processVersionFiles."
```

---

### Task 4: Update `init.ts` to use `WorkspaceRoot`

**Files:**

- Modify: `package/src/cli/commands/init.ts`
- Modify: `package/src/cli/commands/init.test.ts`

- [ ] **Step 1: Update `init.ts`**

1. Remove import:

```typescript
import { findProjectRoot } from "workspace-tools";
```

1. Add import:

```typescript
import { WorkspaceRoot } from "workspaces-effect";
```

1. Remove the `resolveWorkspaceRoot` function (lines 167-169).

2. In the `initCommand` handler, replace:

```typescript
const root = resolveWorkspaceRoot(process.cwd());
```

with:

```typescript
const root = yield* WorkspaceRoot.pipe(
 Effect.flatMap((wr) => wr.find(process.cwd())),
 Effect.catchAll(() => Effect.succeed(process.cwd())),
);
```

1. In check mode, the same replacement applies (the `root` variable is used before the check branch).

- [ ] **Step 2: Update `init.test.ts`**

1. Remove the `workspace-tools` mock:

```typescript
// DELETE:
vi.mock("workspace-tools", () => ({
 findProjectRoot: vi.fn(),
}));
```

1. Remove the `resolveWorkspaceRoot` import and its tests. The function is deleted.

2. For tests that called `resolveWorkspaceRoot`, they now need a `WorkspaceRoot` layer. Add:

```typescript
import { WorkspaceRoot } from "workspaces-effect";
import { Layer } from "effect";
```

Since the `initCommand` handler is tested via the CLI command (which is wrapped in `/* v8 ignore */`), and individual functions like `handleConfig`, `handleBaseMarkdownlint`, etc. are tested independently (they don't use `WorkspaceRoot`), the only tests affected are the `resolveWorkspaceRoot` tests — which we delete since the function is removed.

1. For the `resolveWorkspaceRoot` tests (lines 95-107), delete the entire describe block.

- [ ] **Step 3: Run tests**

Run: `pnpm vitest run package/src/cli/commands/init.test.ts`

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add package/src/cli/commands/init.ts package/src/cli/commands/init.test.ts
git commit -m "refactor: replace findProjectRoot with WorkspaceRoot service in init command"
```

---

### Task 5: Delete `Workspace` class and provide `WorkspacesLive` layer

**Files:**

- Delete: `package/src/utils/workspace.ts`
- Delete: `package/src/utils/workspace.test.ts`
- Modify: `package/src/cli/index.ts`

- [ ] **Step 1: Delete `workspace.ts` and `workspace.test.ts`**

```bash
git rm package/src/utils/workspace.ts package/src/utils/workspace.test.ts
```

- [ ] **Step 2: Verify no remaining imports of `workspace.ts`**

Run: `grep -r "workspace.js" package/src/ --include="*.ts"`

Expected: No matches (version.ts was already updated in Task 3).

- [ ] **Step 3: Add `WorkspacesLive` to CLI entry point**

In `package/src/cli/index.ts`, add the import and provide the layer:

```typescript
import { WorkspacesLive } from "workspaces-effect";
```

Update `runCli()`:

```typescript
export function runCli(): void {
 const main = Effect.suspend(() => cli(process.argv)).pipe(
  Effect.provide(WorkspacesLive),
  Effect.provide(NodeContext.layer),
 );
 NodeRuntime.runMain(main);
}
```

`WorkspacesLive` requires `FileSystem` + `Path`, both provided by `NodeContext.layer`.

- [ ] **Step 4: Run full test suite**

Run: `pnpm vitest run`

Expected: All tests pass. The deleted files' tests are gone, and all remaining tests use the new service-based approach.

- [ ] **Step 5: Commit**

```bash
git add -u package/src/utils/workspace.ts package/src/utils/workspace.test.ts
git add package/src/cli/index.ts
git commit -m "refactor: delete Workspace class, provide WorkspacesLive in CLI

Remove the static Workspace utility class. All workspace operations
now use workspaces-effect services provided at the CLI entry point."
```

---

### Task 6: Final verification

**Files:** None (verification only)

- [ ] **Step 1: Verify no remaining `workspace-tools` references**

Run: `grep -r "workspace-tools" package/src/ --include="*.ts"`

Expected: No matches.

- [ ] **Step 2: Run full test suite**

Run: `pnpm vitest run`

Expected: All tests pass.

- [ ] **Step 3: Run typecheck**

Run: `pnpm run typecheck`

Expected: No errors.

- [ ] **Step 4: Run lint**

Run: `pnpm run lint`

Expected: Clean.

- [ ] **Step 5: Run build**

Run: `pnpm run build`

Expected: Both dev and prod builds succeed.

- [ ] **Step 6: Run coverage**

Run: `pnpm run test:coverage`

Expected: Coverage thresholds met. Some coverage may drop from deleted `workspace.ts` tests, but the behavior is now tested at the command level.
