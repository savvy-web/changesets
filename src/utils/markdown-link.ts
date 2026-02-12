/**
 * Markdown link extraction utilities.
 *
 * @packageDocumentation
 */

/**
 * Pattern matching markdown link format: `[text](url)`.
 *
 * Capture groups:
 * - `[1]` — link text
 * - `[2]` — URL
 */
export const MARKDOWN_LINK_PATTERN: RegExp = /\[([^\]]+)\]\(([^)]+)\)/;

/**
 * Extract a plain URL from a markdown-formatted link.
 *
 * The \@changesets/get-github-info package sometimes returns markdown links
 * like `[#17](https://github.com/owner/repo/pull/17)` instead of plain URLs.
 * This helper extracts the URL portion, or returns the input unchanged if
 * it is already a plain URL.
 *
 * @param linkOrUrl - A markdown link or plain URL string
 * @returns The extracted plain URL
 */
export function extractUrlFromMarkdown(linkOrUrl: string): string {
	const match = MARKDOWN_LINK_PATTERN.exec(linkOrUrl);
	return match ? match[2] : linkOrUrl;
}
