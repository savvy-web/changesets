/**
 * Lint command — validate changeset files.
 *
 * Machine-readable output: one line per error in `file:line:col rule message` format.
 *
 * @internal
 */

import { resolve } from "node:path";
import { Args, Command, Options } from "@effect/cli";
import { Effect } from "effect";

import { ChangesetLinter } from "../../api/linter.js";

/* v8 ignore start -- CLI option definitions; handler tested via runLint */
const dirArg = Args.directory({ name: "dir" }).pipe(Args.withDefault(".changeset"));

const quietOption = Options.boolean("quiet").pipe(
	Options.withAlias("q"),
	Options.withDescription("Only output errors, no summary"),
	Options.withDefault(false),
);
/* v8 ignore stop */

/** @internal */
export function runLint(dir: string, quiet: boolean) {
	return Effect.gen(function* () {
		const resolved = resolve(dir);
		const messages = yield* Effect.try(() => ChangesetLinter.validate(resolved));

		for (const msg of messages) {
			yield* Effect.log(`${msg.file}:${msg.line}:${msg.column} ${msg.rule} ${msg.message}`);
		}

		if (!quiet && messages.length === 0) {
			yield* Effect.log("No lint errors found.");
		}

		if (messages.length > 0) {
			process.exitCode = 1;
		}
	});
}

/* v8 ignore next 3 -- CLI registration; handler tested via runLint */
export const lintCommand = Command.make("lint", { dir: dirArg, quiet: quietOption }, ({ dir, quiet }) =>
	runLint(dir, quiet),
).pipe(Command.withDescription("Validate changeset files"));
