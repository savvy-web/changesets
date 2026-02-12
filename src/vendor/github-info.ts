/**
 * Effect wrapper around \@changesets/get-github-info.
 *
 * @internal
 */

import { getInfo } from "@changesets/get-github-info";
import { Effect } from "effect";

import { GitHubApiError } from "../errors.js";

/**
 * Structured result from the GitHub commit info API.
 *
 * @public
 */
export interface GitHubCommitInfo {
	/** The GitHub username of the commit author (null if unknown). */
	user: string | null;
	/** The pull request number associated with this commit (null if none). */
	pull: number | null;
	/** Markdown-formatted links for the commit, PR, and user. */
	links: {
		/** Link to the commit on GitHub. */
		commit: string;
		/** Link to the associated pull request (null if none). */
		pull: string | null;
		/** Link to the author's GitHub profile (null if unknown). */
		user: string | null;
	};
}

/**
 * Fetch GitHub info for a commit, wrapped in Effect.
 *
 * @param params - The commit hash and repo in `owner/repo` format
 * @returns An Effect that resolves to commit info or fails with {@link GitHubApiError}
 *
 * @internal
 */
export function getGitHubInfo(params: {
	commit: string;
	repo: string;
}): Effect.Effect<GitHubCommitInfo, GitHubApiError> {
	return Effect.tryPromise({
		try: () => getInfo({ commit: params.commit, repo: params.repo }),
		/* v8 ignore next 5 -- error mapping tested via GitHubService test layer */
		catch: (error) =>
			new GitHubApiError({
				operation: "getInfo",
				reason: error instanceof Error ? error.message : String(error),
			}),
	});
}
