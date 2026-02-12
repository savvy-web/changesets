/**
 * Effect wrapper around \@changesets/get-github-info.
 *
 * @packageDocumentation
 */

import { getInfo } from "@changesets/get-github-info";
import { Effect } from "effect";

import { GitHubApiError } from "../errors.js";

/**
 * Structured result from the GitHub commit info API.
 */
export interface GitHubCommitInfo {
	/** The GitHub username of the commit author (null if unknown) */
	user: string | null;
	/** The pull request number associated with this commit (null if none) */
	pull: number | null;
	/** Markdown-formatted links for the commit, PR, and user */
	links: {
		commit: string;
		pull: string | null;
		user: string | null;
	};
}

/**
 * Fetch GitHub info for a commit, wrapped in Effect.
 *
 * @param params - The commit hash and repo
 * @returns An Effect that resolves to commit info or fails with GitHubApiError
 */
export function getGitHubInfo(params: {
	commit: string;
	repo: string;
}): Effect.Effect<GitHubCommitInfo, GitHubApiError> {
	return Effect.tryPromise({
		try: () => getInfo({ commit: params.commit, repo: params.repo }),
		catch: (error) =>
			new GitHubApiError({
				operation: "getInfo",
				reason: error instanceof Error ? error.message : String(error),
			}),
	});
}
