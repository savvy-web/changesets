/**
 * Shared helpers for markdownlint custom rules.
 *
 * @internal
 */

import type { MicromarkToken } from "markdownlint";

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
