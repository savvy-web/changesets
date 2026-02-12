/**
 * CLI entry point using `@effect/cli`.
 *
 * Provides the `savvy-changesets` CLI application with subcommands
 * for linting, transforming, and checking changeset files.
 *
 * @internal
 */

import { Command } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Effect } from "effect";

import { checkCommand } from "./commands/check.js";
import { initCommand } from "./commands/init.js";
import { lintCommand } from "./commands/lint.js";
import { transformCommand } from "./commands/transform.js";
import { versionCommand } from "./commands/version.js";

const rootCommand = Command.make("savvy-changesets").pipe(
	Command.withSubcommands([initCommand, lintCommand, transformCommand, checkCommand, versionCommand]),
);

const cli = Command.run(rootCommand, {
	name: "savvy-changesets",
	version: process.env.__PACKAGE_VERSION__ ?? "0.0.0",
});

export function runCli(): void {
	const main = Effect.suspend(() => cli(process.argv)).pipe(Effect.provide(NodeContext.layer));
	NodeRuntime.runMain(main);
}
