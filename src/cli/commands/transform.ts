/**
 * Transform command — post-process CHANGELOG.md.
 *
 * Runs all remark transform plugins against a changelog file.
 *
 * @internal
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Args, Command, Options } from "@effect/cli";
import { Effect } from "effect";

import { ChangelogTransformer } from "../../api/transformer.js";

/* v8 ignore start -- CLI option definitions; handler tested via runTransform */
const fileArg = Args.file({ name: "file" }).pipe(Args.withDefault("CHANGELOG.md"));

const dryRunOption = Options.boolean("dry-run").pipe(
	Options.withAlias("n"),
	Options.withDescription("Print transformed output instead of writing"),
	Options.withDefault(false),
);

const checkOption = Options.boolean("check").pipe(
	Options.withAlias("c"),
	Options.withDescription("Exit 1 if file would change (for CI)"),
	Options.withDefault(false),
);
/* v8 ignore stop */

/** @internal */
export function runTransform(file: string, dryRun: boolean, check: boolean) {
	return Effect.gen(function* () {
		const resolved = resolve(file);
		const content = yield* Effect.try(() => readFileSync(resolved, "utf-8"));
		const result = ChangelogTransformer.transformContent(content);

		if (dryRun) {
			yield* Effect.log(result);
			return;
		}

		if (check) {
			if (result !== content) {
				yield* Effect.log(`${resolved} would be modified by transform.`);
				process.exitCode = 1;
			} else {
				yield* Effect.log(`${resolved} is already formatted.`);
			}
			return;
		}

		yield* Effect.try(() => writeFileSync(resolved, result, "utf-8"));
		yield* Effect.log(`Transformed ${resolved}`);
	});
}

/* v8 ignore next 5 -- CLI registration; handler tested via runTransform */
export const transformCommand = Command.make(
	"transform",
	{ file: fileArg, dryRun: dryRunOption, check: checkOption },
	({ file, dryRun, check }) => runTransform(file, dryRun, check),
).pipe(Command.withDescription("Post-process CHANGELOG.md"));
