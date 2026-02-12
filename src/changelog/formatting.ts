/**
 * Changelog entry formatting helpers.
 *
 * @internal
 */

import type { IssueReferences } from "../utils/issue-refs.js";
import { extractUrlFromMarkdown } from "../utils/markdown-link.js";

/**
 * A single changelog entry ready for formatting.
 *
 * @internal
 */
export interface ChangelogEntry {
	/** Full commit hash (optional). */
	commit?: string;
	/** Type of change (e.g., "feat", "fix"). */
	type: string;
	/** Scope of the change (optional). */
	scope?: string;
	/** Summary description. */
	summary: string;
	/** Referenced GitHub issues. */
	issues: IssueReferences;
}

/**
 * Format a changelog entry into a markdown string with GitHub links.
 *
 * Produces a commit-link prefix followed by the summary and issue references.
 *
 * @param entry - The changelog entry
 * @param options - Must include `repo` in `owner/repo` format
 * @returns Formatted markdown (without leading `- `)
 *
 * @internal
 */
export function formatChangelogEntry(entry: ChangelogEntry, options: { repo: string }): string {
	const parts: string[] = [];

	if (entry.commit) {
		const shortHash = entry.commit.substring(0, 7);
		parts.push(`[\`${shortHash}\`](https://github.com/${options.repo}/commit/${entry.commit})`);
	}

	parts.push(entry.summary.trim());

	const issueLinks: string[] = [];

	if (entry.issues.closes.length > 0) {
		const links = entry.issues.closes.map((num) => `[#${num}](https://github.com/${options.repo}/issues/${num})`);
		issueLinks.push(`Closes: ${links.join(", ")}`);
	}

	if (entry.issues.fixes.length > 0) {
		const links = entry.issues.fixes.map((num) => `[#${num}](https://github.com/${options.repo}/issues/${num})`);
		issueLinks.push(`Fixes: ${links.join(", ")}`);
	}

	if (entry.issues.refs.length > 0) {
		const links = entry.issues.refs.map((num) => `[#${num}](https://github.com/${options.repo}/issues/${num})`);
		issueLinks.push(`Refs: ${links.join(", ")}`);
	}

	if (issueLinks.length > 0) {
		parts.push(`\n\n${issueLinks.join(". ")}`);
	}

	return parts.join(" ");
}

/**
 * Format PR reference and user attribution for a changelog entry.
 *
 * @remarks
 * The `links` parameter may contain either plain URLs or markdown-formatted
 * links (e.g., `[#42](https://...)`). This function handles both formats
 * via {@link extractUrlFromMarkdown}.
 *
 * @param pr - Pull request number
 * @param user - GitHub username
 * @param links - Optional links for PR and user (may be markdown-formatted)
 * @returns Formatted attribution string (with leading space) or empty string
 *
 * @internal
 */
export function formatPRAndUserAttribution(
	pr?: number,
	user?: string,
	links?: { pull?: string; user?: string },
): string {
	let prReference = "";

	if (pr) {
		if (links?.pull) {
			const pullUrl = extractUrlFromMarkdown(links.pull);
			prReference = ` [#${String(pr)}](${pullUrl})`;
		} else {
			prReference = ` (#${String(pr)})`;
		}
	}

	if (user) {
		if (links?.user) {
			const userUrl = extractUrlFromMarkdown(links.user);
			return `${prReference} Thanks [@${user}](${userUrl})!`;
		}
		return `${prReference} Thanks @${user}!`;
	}

	return prReference;
}
