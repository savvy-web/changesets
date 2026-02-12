/**
 * GitHub-related schemas.
 *
 * @packageDocumentation
 */

import { Schema } from "effect";

import { PositiveInteger } from "./primitives.js";

/** Pattern to extract URL from markdown link syntax `[text](url)`. */
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/;

/**
 * Schema for a GitHub username.
 *
 * Rules: alphanumeric and hyphens, cannot start/end with hyphen.
 */
export const UsernameSchema = Schema.String.pipe(
	Schema.pattern(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/, {
		message: () => "Invalid GitHub username format",
	}),
);

/**
 * Schema for a GitHub issue or PR number (positive integer).
 */
export const IssueNumberSchema = PositiveInteger.annotations({
	title: "IssueNumber",
	description: "GitHub issue or pull request number",
});

/**
 * Schema accepting either a plain URL or a markdown link `[text](url)`.
 *
 * Used for GitHub API responses from \@changesets/get-github-info.
 */
export const UrlOrMarkdownLinkSchema = Schema.String.pipe(
	Schema.filter(
		(value) => {
			// Accept plain URLs
			try {
				new URL(value);
				return true;
			} catch {
				// Not a plain URL, check if it's a markdown link
				const match = MARKDOWN_LINK_PATTERN.exec(value);
				if (match?.[2]) {
					try {
						new URL(match[2]);
						return true;
					} catch {
						return false;
					}
				}
				return false;
			}
		},
		{ message: () => "Invalid URL or markdown link format" },
	),
);

/**
 * Schema for a GitHub info response from \@changesets/get-github-info.
 */
export const GitHubInfoSchema = Schema.Struct({
	user: Schema.optional(UsernameSchema),
	pull: Schema.optional(IssueNumberSchema),
	links: Schema.Struct({
		commit: UrlOrMarkdownLinkSchema,
		pull: Schema.optional(UrlOrMarkdownLinkSchema),
		user: Schema.optional(UrlOrMarkdownLinkSchema),
	}),
});

/**
 * Inferred type for {@link GitHubInfoSchema}.
 */
export interface GitHubInfo extends Schema.Schema.Type<typeof GitHubInfoSchema> {}
