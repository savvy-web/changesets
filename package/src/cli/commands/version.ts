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
 *    {@link Workspace.detectPackageManager}.
 * 2. Run `changeset version` (skipped with `--dry-run`).
 * 3. Discover all CHANGELOG.md files across workspace packages via
 *    {@link Workspace.discoverChangelogs}.
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
import { Command, Options } from "@effect/cli";
import { ChangesetConfigReader, ChangesetConfigReaderLive } from "@savvy-web/silk-effects";
import { Effect } from "effect";

import { ChangelogTransformer } from "../../api/transformer.js";
import { VersionFileError } from "../../errors.js";
import { VersionFiles } from "../../utils/version-files.js";
import { Workspace } from "../../utils/workspace.js";

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
		const pm = Workspace.detectPackageManager(cwd);
		yield* Effect.log(`Detected package manager: ${pm}`);

		// 2. Run changeset version (unless --dry-run)
		if (!dryRun) {
			const cmd = Workspace.getChangesetVersionCommand(pm);
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
		const changelogs = Workspace.discoverChangelogs(cwd);

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
	});
}

/* v8 ignore next 5 -- CLI registration; handler tested via runVersion */
export const versionCommand = Command.make("version", { dryRun: dryRunOption }, ({ dryRun }) =>
	runVersion(dryRun).pipe(Effect.provide(ChangesetConfigReaderLive)),
).pipe(Command.withDescription("Run changeset version and transform all CHANGELOGs"));
