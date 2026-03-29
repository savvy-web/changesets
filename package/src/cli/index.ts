/**
 * CLI entry point using `\@effect/cli`.
 *
 * Provides the `savvy-changesets` CLI application with subcommands for
 * initializing, linting, transforming, checking, and versioning changeset
 * files. The root command is assembled from the individual subcommand modules
 * and executed via `\@effect/platform-node`.
 *
 * @remarks
 * The root command registers five subcommands:
 * - `init` -- bootstrap a repository for \@savvy-web/changesets
 * - `lint` -- machine-readable changeset validation
 * - `transform` -- CHANGELOG.md post-processing
 * - `check` -- human-readable validation summary
 * - `version` -- run `changeset version` and transform all CHANGELOGs
 *
 * The CLI version is injected at build time via the `__PACKAGE_VERSION__`
 * environment variable.
 *
 * @example
 * ```bash
 * savvy-changesets lint .changeset
 * savvy-changesets check .changeset
 * savvy-changesets transform CHANGELOG.md --dry-run
 * savvy-changesets version --dry-run
 * savvy-changesets init --force
 * ```
 *
 * @internal
 */

import { Command } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { WorkspacesLive } from "workspaces-effect";

import { checkCommand } from "./commands/check.js";
import { initCommand } from "./commands/init.js";
import { lintCommand } from "./commands/lint.js";
import { transformCommand } from "./commands/transform.js";
import { validateFileCommand } from "./commands/validate-file.js";
import { versionCommand } from "./commands/version.js";

/* v8 ignore start -- CLI registration; each command tested via exported handler */
const rootCommand = Command.make("savvy-changesets").pipe(
	Command.withSubcommands([
		initCommand,
		lintCommand,
		transformCommand,
		checkCommand,
		validateFileCommand,
		versionCommand,
	]),
);

const cli = Command.run(rootCommand, {
	name: "savvy-changesets",
	version: process.env.__PACKAGE_VERSION__ ?? "0.0.0",
});

/**
 * Bootstrap and run the `savvy-changesets` CLI application.
 *
 * Creates an Effect program from the parsed `process.argv`, provides the
 * `NodeContext` layer, and hands execution to `NodeRuntime.runMain`.
 *
 * @internal
 */
export function runCli(): void {
	const main = Effect.suspend(() => cli(process.argv)).pipe(
		Effect.provide(Layer.provideMerge(WorkspacesLive, NodeContext.layer)),
	);
	NodeRuntime.runMain(main);
}
/* v8 ignore stop */
