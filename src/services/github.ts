/**
 * GitHub service for fetching commit metadata.
 */

import { Context, Effect, Layer } from "effect";

import { GitHubApiError } from "../errors.js";
import type { GitHubCommitInfo } from "../vendor/github-info.js";
import { getGitHubInfo } from "../vendor/github-info.js";

/**
 * Base tag for GitHubService.
 *
 * @privateRemarks
 * This export is required for api-extractor documentation generation.
 * Effect's Context.Tag creates an anonymous base class that must be
 * explicitly exported to avoid "forgotten export" warnings. Do not delete.
 *
 * @internal
 */
export const GitHubServiceTag = Context.Tag("GitHubService");

/**
 * Service for GitHub API operations.
 *
 * @see {@link GitHubLive} for the production layer
 * @see {@link makeGitHubTest} for creating test layers
 *
 * @public
 */
export class GitHubService extends GitHubServiceTag<
	GitHubService,
	{
		/** Fetch commit info (author, PR, links) for a given commit. */
		readonly getInfo: (params: { commit: string; repo: string }) => Effect.Effect<GitHubCommitInfo, GitHubApiError>;
	}
>() {}

/**
 * Live layer that delegates to \@changesets/get-github-info.
 *
 * @public
 */
export const GitHubLive = Layer.succeed(GitHubService, {
	getInfo: (params) => getGitHubInfo(params),
});

/**
 * Create a test layer with pre-configured responses keyed by commit hash.
 *
 * @param responses - A map of commit hash to {@link GitHubCommitInfo}
 * @returns A Layer providing the {@link GitHubService}
 *
 * @public
 */
export function makeGitHubTest(responses: Map<string, GitHubCommitInfo>): Layer.Layer<GitHubService> {
	return Layer.succeed(GitHubService, {
		getInfo: (params) => {
			const info = responses.get(params.commit);
			if (info) {
				return Effect.succeed(info);
			}
			return Effect.fail(
				new GitHubApiError({
					operation: "getInfo",
					reason: `No mock response for commit ${params.commit}`,
				}),
			);
		},
	});
}
