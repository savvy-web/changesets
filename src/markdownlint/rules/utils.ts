/**
 * Shared helpers for markdownlint custom rules.
 *
 * @internal
 */

import type { MicromarkToken } from "markdownlint";

/** Base URL for rule documentation on GitHub. */
const DOCS_BASE = "https://github.com/savvy-web/changesets/blob/main/src/markdownlint/rules/docs";

/** Documentation URLs for each changeset lint rule. */
export const RULE_DOCS = {
	CSH001: `${DOCS_BASE}/CSH001.md`,
	CSH002: `${DOCS_BASE}/CSH002.md`,
	CSH003: `${DOCS_BASE}/CSH003.md`,
	CSH004: `${DOCS_BASE}/CSH004.md`,
} as const;

/**
 * Get the heading level (1-6) from an `atxHeading` token.
 *
 * @param heading - The `atxHeading` micromark token
 * @returns The heading depth (number of `#` characters), or 0 if no sequence found
 *
 * @internal
 */
export function getHeadingLevel(heading: MicromarkToken): number {
	const sequence = heading.children.find((c) => c.type === "atxHeadingSequence");
	return sequence ? sequence.text.length : 0;
}

/**
 * Get the plain text content of an `atxHeading` token.
 *
 * @param heading - The `atxHeading` micromark token
 * @returns The heading text, or empty string if no text token found
 *
 * @internal
 */
export function getHeadingText(heading: MicromarkToken): string {
	const textToken = heading.children.find((c) => c.type === "atxHeadingText");
	return textToken ? textToken.text : "";
}
