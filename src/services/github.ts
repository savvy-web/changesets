/**
 * GitHub service for fetching commit metadata.
 *
 * @packageDocumentation
 */

import { Context, Effect, Layer } from "effect";

import { GitHubApiError } from "../errors.js";
import type { GitHubCommitInfo } from "../vendor/github-info.js";
import { getGitHubInfo } from "../vendor/github-info.js";

/**
 * Service for GitHub API operations.
 */
export class GitHubService extends Context.Tag("GitHubService")<
	GitHubService,
	{
		/** Fetch commit info (author, PR, links) for a given commit. */
		readonly getInfo: (params: { commit: string; repo: string }) => Effect.Effect<GitHubCommitInfo, GitHubApiError>;
	}
>() {}

/**
 * Live layer that delegates to \@changesets/get-github-info.
 */
export const GitHubLive = Layer.succeed(GitHubService, {
	getInfo: (params) => getGitHubInfo(params),
});

/**
 * Create a test layer with pre-configured responses keyed by commit hash.
 *
 * @param responses - A map of commit hash → GitHubCommitInfo
 * @returns A Layer providing the GitHubService
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
