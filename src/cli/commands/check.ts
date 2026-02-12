/**
 * Check command — full validation pipeline with human-readable output.
 *
 * Runs lint on all changeset files and reports a grouped summary
 * with pass/fail counts.
 *
 * @internal
 */

import { resolve } from "node:path";
import { Args, Command } from "@effect/cli";
import { Effect } from "effect";

import type { LintMessage } from "../../api/linter.js";
import { ChangesetLinter } from "../../api/linter.js";

/* v8 ignore next */
const dirArg = Args.directory({ name: "dir" }).pipe(Args.withDefault(".changeset"));

/** @internal */
export function runCheck(dir: string) {
	return Effect.gen(function* () {
		const resolved = resolve(dir);
		const messages = yield* Effect.try(() => ChangesetLinter.validate(resolved));

		// Group messages by file
		const byFile = new Map<string, LintMessage[]>();
		for (const msg of messages) {
			const existing = byFile.get(msg.file);
			if (existing) {
				existing.push(msg);
			} else {
				byFile.set(msg.file, [msg]);
			}
		}

		// Log grouped results
		for (const [file, fileMessages] of byFile) {
			yield* Effect.log(`\n${file}`);
			for (const msg of fileMessages) {
				yield* Effect.log(`  ${msg.line}:${msg.column}  ${msg.rule}  ${msg.message}`);
			}
		}

		// Count files checked (all md files, not just those with errors)
		const errorCount = messages.length;
		const filesWithErrors = byFile.size;

		if (errorCount > 0) {
			yield* Effect.log(`\n${filesWithErrors} file(s) with errors, ${errorCount} error(s) found`);
			process.exitCode = 1;
		} else {
			yield* Effect.log("All changeset files passed validation.");
		}
	});
}

/* v8 ignore next 3 -- CLI registration; handler tested via runCheck */
export const checkCommand = Command.make("check", { dir: dirArg }, ({ dir }) => runCheck(dir)).pipe(
	Command.withDescription("Full changeset validation with summary"),
);
