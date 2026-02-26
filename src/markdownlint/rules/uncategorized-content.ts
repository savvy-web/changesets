import type { Rule } from "markdownlint";

import { getHeadingLevel } from "./utils.js";

/**
 * markdownlint rule: changeset-uncategorized-content (CSH004)
 *
 * Detects content that appears before the first h2 heading in a changeset file.
 * All content must be placed under a categorized section (## heading).
 */
export const UncategorizedContentRule: Rule = {
	names: ["changeset-uncategorized-content", "CSH004"],
	description: "All content must be placed under a category heading (## heading)",
	tags: ["changeset"],
	parser: "micromark",
	function: function CSH004(params, onError) {
		const tokens = params.parsers.micromark.tokens;

		for (const token of tokens) {
			// Stop at the first h2 — everything after is categorized
			if (token.type === "atxHeading" && getHeadingLevel(token) === 2) {
				break;
			}

			// Skip blank lines, line endings, and HTML comments
			if (token.type === "lineEnding" || token.type === "lineEndingBlank" || token.type === "htmlFlow") {
				continue;
			}

			// Any other top-level token before the first h2 is uncategorized content
			if (token.type !== "atxHeading") {
				onError({
					lineNumber: token.startLine,
					detail: "Content must be placed under a category heading (## heading)",
				});
			}
		}
	},
};
