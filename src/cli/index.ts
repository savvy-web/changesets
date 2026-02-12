/**
 * CLI entry point using `@effect/cli`.
 *
 * Provides the `savvy-changeset` CLI application with subcommands
 * for linting, transforming, and checking changeset files.
 *
 * @internal
 */

import { Command } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Effect } from "effect";

import { checkCommand } from "./commands/check.js";
import { lintCommand } from "./commands/lint.js";
import { transformCommand } from "./commands/transform.js";

const rootCommand = Command.make("savvy-changeset").pipe(
	Command.withSubcommands([lintCommand, transformCommand, checkCommand]),
);

const cli = Command.run(rootCommand, {
	name: "savvy-changeset",
	version: process.env.__PACKAGE_VERSION__ ?? "0.0.0",
});

export function runCli(): void {
	const main = Effect.suspend(() => cli(process.argv)).pipe(Effect.provide(NodeContext.layer));
	NodeRuntime.runMain(main);
}
