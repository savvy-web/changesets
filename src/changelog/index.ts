/**
 * Changesets API changelog formatter.
 *
 * This module exports the `ChangelogFunctions` required by the Changesets API.
 * Configure in `.changeset/config.json`:
 *
 * ```json
 * {
 *   "changelog": ["\@savvy-web/changesets/changelog", { "repo": "savvy-web/package-name" }]
 * }
 * ```
 *
 * @packageDocumentation
 */

import { Effect, Layer } from "effect";

import { validateChangesetOptions } from "../schemas/options.js";
import { GitHubLive } from "../services/github.js";
import { MarkdownLive } from "../services/markdown.js";
import type { ChangelogFunctions } from "../vendor/types.js";
import { getDependencyReleaseLine as getDependencyReleaseLineEffect } from "./getDependencyReleaseLine.js";
import { getReleaseLine as getReleaseLineEffect } from "./getReleaseLine.js";

/**
 * Combined layer providing all services needed by the formatters.
 */
const MainLayer = Layer.mergeAll(GitHubLive, MarkdownLive);

const changelogFunctions: ChangelogFunctions = {
	getReleaseLine: async (changeset, versionType, options) => {
		const program = Effect.gen(function* () {
			const opts = yield* validateChangesetOptions(options);
			return yield* getReleaseLineEffect(changeset, versionType, opts);
		});
		return Effect.runPromise(program.pipe(Effect.provide(MainLayer)));
	},

	getDependencyReleaseLine: async (changesets, dependenciesUpdated, options) => {
		const program = Effect.gen(function* () {
			const opts = yield* validateChangesetOptions(options);
			return yield* getDependencyReleaseLineEffect(changesets, dependenciesUpdated, opts);
		});
		return Effect.runPromise(program.pipe(Effect.provide(MainLayer)));
	},
};

export default changelogFunctions;
