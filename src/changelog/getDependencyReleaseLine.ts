/**
 * Core formatter: getDependencyReleaseLine.
 *
 * Formats dependency update entries for the changelog with commit links.
 *
 */

import { Effect } from "effect";

import type { ChangesetOptions } from "../schemas/options.js";
import { GitHubService } from "../services/github.js";
import { logWarning } from "../utils/logger.js";
import type { ModCompWithPackage, NewChangesetWithCommit } from "../vendor/types.js";

/**
 * Format dependency release lines as an Effect program.
 *
 * @param changesets - Changesets that caused dependency updates
 * @param dependenciesUpdated - Dependencies that were updated
 * @param options - Validated configuration options
 * @returns Formatted markdown string, or empty string if no deps updated
 */
export function getDependencyReleaseLine(
	changesets: NewChangesetWithCommit[],
	dependenciesUpdated: ModCompWithPackage[],
	options: ChangesetOptions,
): Effect.Effect<string, never, GitHubService> {
	return Effect.gen(function* () {
		if (dependenciesUpdated.length === 0) return "";

		const github = yield* GitHubService;
		let apiFailures = 0;
		const totalWithCommit = changesets.filter((cs) => cs.commit).length;

		// Process changesets to collect commit links
		const commitLinks = yield* Effect.forEach(
			changesets,
			(cs) => {
				const commit = cs.commit;
				if (!commit) return Effect.succeed(null);

				return github.getInfo({ commit, repo: options.repo }).pipe(
					Effect.map((info) => info.links.commit),
					Effect.catchAll((error) => {
						apiFailures++;
						logWarning(`Failed to fetch GitHub info for commit ${commit}:`, String(error));
						// Fallback: build link manually
						return Effect.succeed(
							`[\`${commit.substring(0, 7)}\`](https://github.com/${options.repo}/commit/${commit})`,
						);
					}),
				);
			},
			{ concurrency: 10 },
		);

		// Log metrics on failures
		if (apiFailures > 0) {
			const successRate = (((totalWithCommit - apiFailures) / totalWithCommit) * 100).toFixed(1);
			logWarning(
				`GitHub API calls completed with ${apiFailures}/${totalWithCommit} failures (${successRate}% success rate)`,
			);
		}

		const validLinks = commitLinks.filter(Boolean);
		const changesetLink =
			validLinks.length > 0 ? `- Updated dependencies [${validLinks.join(", ")}]:` : "- Updated dependencies:";

		const updatedDependenciesList = dependenciesUpdated.map((dep) => `  - ${dep.name}@${dep.newVersion}`);

		return [changesetLink, ...updatedDependenciesList].join("\n");
	});
}
