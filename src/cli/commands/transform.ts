/**
 * Transform command -- post-process CHANGELOG.md.
 *
 * Runs all remark transform plugins (section reordering, deduplication,
 * contributor footnotes, issue link references, and format normalization)
 * against a changelog file.
 *
 * @remarks
 * The command supports three modes:
 * - **Default** -- read the file, transform, and write back in place.
 * - **`--dry-run` / `-n`** -- print the transformed output to stdout
 *   without writing.
 * - **`--check` / `-c`** -- compare the transformed output against the
 *   original and exit with code 1 if they differ (useful in CI).
 *
 * @example
 * ```bash
 * savvy-changesets transform CHANGELOG.md
 * savvy-changesets transform --dry-run CHANGELOG.md
 * savvy-changesets transform --check CHANGELOG.md
 * ```
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

/**
 * Run the remark transform pipeline on a single changelog file.
 *
 * Reads the file at `file`, applies all remark transform plugins via
 * {@link ChangelogTransformer.transformContent}, and either writes the result
 * back, prints it to stdout (`dryRun`), or checks for differences (`check`).
 *
 * @param file - Path to the CHANGELOG.md file (resolved relative to cwd)
 * @param dryRun - When `true`, print transformed output instead of writing
 * @param check - When `true`, exit with code 1 if the file would change
 * @returns An Effect that performs the transformation
 *
 * @internal
 */
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
