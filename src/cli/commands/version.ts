/**
 * Version command — orchestrate changeset version + changelog transforms.
 *
 * Detects the package manager, runs `changeset version`, discovers all
 * workspace CHANGELOG.md files, and transforms each one.
 *
 * @internal
 */

import { execSync } from "node:child_process";
import { Command, Options } from "@effect/cli";
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

/** @internal */
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
		const versionFileConfigs = VersionFiles.readConfig(cwd);
		if (versionFileConfigs) {
			yield* Effect.log(`Found ${versionFileConfigs.length} versionFiles config(s)`);
			const updates = yield* Effect.try({
				try: () => VersionFiles.processVersionFiles(cwd, versionFileConfigs, dryRun),
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

/* v8 ignore next 3 -- CLI registration; handler tested via runVersion */
export const versionCommand = Command.make("version", { dryRun: dryRunOption }, ({ dryRun }) =>
	runVersion(dryRun),
).pipe(Command.withDescription("Run changeset version and transform all CHANGELOGs"));
