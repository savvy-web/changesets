/**
 * GitHub-related schemas.
 */

import { Schema } from "effect";

import { MARKDOWN_LINK_PATTERN } from "../utils/markdown-link.js";
import { PositiveInteger } from "./primitives.js";

/**
 * Test whether a string is a valid URL.
 */
function isValidUrl(value: string): boolean {
	try {
		new URL(value);
		return true;
	} catch {
		return false;
	}
}

/**
 * Schema for a GitHub username.
 *
 * Rules: alphanumeric and hyphens, cannot start/end with hyphen.
 *
 * @public
 */
export const UsernameSchema = Schema.String.pipe(
	Schema.pattern(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/, {
		message: () => "Invalid GitHub username format",
	}),
);

/**
 * Schema for a GitHub issue or PR number (positive integer).
 *
 * @public
 */
export const IssueNumberSchema = PositiveInteger.annotations({
	title: "IssueNumber",
	description: "GitHub issue or pull request number",
});

/**
 * Schema accepting either a plain URL or a markdown link `[text](url)`.
 *
 * Used for GitHub API responses from \@changesets/get-github-info.
 *
 * @public
 */
export const UrlOrMarkdownLinkSchema = Schema.String.pipe(
	Schema.filter(
		(value) => {
			if (isValidUrl(value)) return true;

			const match = MARKDOWN_LINK_PATTERN.exec(value);
			return match?.[2] ? isValidUrl(match[2]) : false;
		},
		{ message: () => "Invalid URL or markdown link format" },
	),
);

/**
 * Schema for a GitHub info response from \@changesets/get-github-info.
 *
 * @public
 */
export const GitHubInfoSchema = Schema.Struct({
	/** GitHub username of the commit author. */
	user: Schema.optional(UsernameSchema),
	/** Pull request number associated with the commit. */
	pull: Schema.optional(IssueNumberSchema),
	/** Markdown-formatted links. */
	links: Schema.Struct({
		/** Link to the commit. */
		commit: UrlOrMarkdownLinkSchema,
		/** Link to the associated pull request. */
		pull: Schema.optional(UrlOrMarkdownLinkSchema),
		/** Link to the author's GitHub profile. */
		user: Schema.optional(UrlOrMarkdownLinkSchema),
	}),
});

/**
 * Inferred type for {@link GitHubInfoSchema}.
 *
 * @public
 */
export interface GitHubInfo extends Schema.Schema.Type<typeof GitHubInfoSchema> {}
