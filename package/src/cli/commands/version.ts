/**
 * Version command -- orchestrate `changeset version` and changelog transforms.
 *
 * Detects the package manager, runs `changeset version`, discovers all
 * workspace CHANGELOG.md files, transforms each one with the remark pipeline,
 * and updates any configured version files.
 *
 * @remarks
 * The command performs five steps:
 * 1. Detect the package manager (`pnpm`, `npm`, `yarn`, `bun`) via
 *    `PackageManagerDetector` from `workspaces-effect`.
 * 2. Run `changeset version` (skipped with `--dry-run`).
 * 3. Discover all CHANGELOG.md files across workspace packages via
 *    `WorkspaceDiscovery` from `workspaces-effect`.
 * 4. Transform each discovered changelog with
 *    {@link ChangelogTransformer.transformFile}.
 * 5. Process version file configs (if present) via
 *    {@link VersionFiles.processVersionFiles}.
 *
 * @example
 * ```bash
 * savvy-changesets version
 * savvy-changesets version --dry-run
 * ```
 *
 * @internal
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Command, Options } from "@effect/cli";
import { ChangesetConfigReader, ChangesetConfigReaderLive } from "@savvy-web/silk-effects";
import { Effect } from "effect";
import { PackageManagerDetector, WorkspaceDiscovery } from "workspaces-effect";

import { ChangelogTransformer } from "../../api/transformer.js";
import { VersionFileError } from "../../errors.js";
import { VersionFiles } from "../../utils/version-files.js";

/**
 * Map package manager to the correct `changeset version` shell command.
 *
 * @internal
 */
function getChangesetVersionCommand(pm: "npm" | "pnpm" | "yarn" | "bun"): string {
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

/* v8 ignore start -- CLI option definitions; handler tested via runVersion */
const dryRunOption = Options.boolean("dry-run").pipe(
	Options.withAlias("n"),
	Options.withDescription("Skip changeset version, only transform existing CHANGELOGs"),
	Options.withDefault(false),
);
/* v8 ignore stop */

/**
 * Run the full version orchestration pipeline.
 *
 * Detects the package manager, optionally runs `changeset version`, discovers
 * and transforms all workspace changelogs, and updates version files.
 *
 * @param dryRun - When `true`, skip `changeset version` and only transform
 *   existing CHANGELOG files
 * @returns An Effect that performs the versioning pipeline
 *
 * @internal
 */
export function runVersion(dryRun: boolean) {
	return Effect.gen(function* () {
		const cwd = process.cwd();

		// 1. Detect package manager
		const detector = yield* PackageManagerDetector;
		const detected = yield* detector
			.detect(cwd)
			.pipe(Effect.catchAll(() => Effect.succeed({ type: "npm" as const, version: undefined })));
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

		// 3. Discover workspace packages and CHANGELOG.md files
		const discovery = yield* WorkspaceDiscovery;
		const packages = yield* discovery
			.listPackages()
			.pipe(
				Effect.catchAll(() => Effect.succeed([] as ReadonlyArray<{ name: string; version: string; path: string }>)),
			);

		const changelogs: Array<{ name: string; path: string; changelogPath: string }> = [];
		const seen = new Set<string>();
		const resolvedCwd = resolve(cwd);

		for (const pkg of packages) {
			const changelogPath = join(pkg.path, "CHANGELOG.md");
			if (existsSync(changelogPath) && !seen.has(pkg.path)) {
				seen.add(pkg.path);
				changelogs.push({ name: pkg.name, path: pkg.path, changelogPath });
			}
		}

		// Always check root (dedup if already found as workspace entry)
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

/* v8 ignore next 5 -- CLI registration; handler tested via runVersion */
export const versionCommand = Command.make("version", { dryRun: dryRunOption }, ({ dryRun }) =>
	runVersion(dryRun).pipe(Effect.provide(ChangesetConfigReaderLive)),
).pipe(Command.withDescription("Run changeset version and transform all CHANGELOGs"));
