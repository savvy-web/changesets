import type { Rule } from "markdownlint";

import { getHeadingLevel } from "./utils.js";

/**
 * markdownlint rule: changeset-heading-hierarchy (CSH001)
 *
 * Validates heading structure in changeset files:
 * - No h1 headings allowed
 * - Headings must start at h2
 * - No depth skips (e.g., h2 ... h4 is invalid)
 */
export const HeadingHierarchyRule: Rule = {
	names: ["changeset-heading-hierarchy", "CSH001"],
	description: "Heading hierarchy must start at h2 with no h1 or depth skips",
	tags: ["changeset"],
	parser: "micromark",
	function: function CSH001(params, onError) {
		let prevDepth = 0;

		for (const token of params.parsers.micromark.tokens) {
			if (token.type !== "atxHeading") {
				continue;
			}

			const depth = getHeadingLevel(token);

			if (depth === 1) {
				onError({
					lineNumber: token.startLine,
					detail: "h1 headings are not allowed in changeset files",
				});
				continue;
			}

			if (prevDepth > 0 && depth > prevDepth + 1) {
				onError({
					lineNumber: token.startLine,
					detail: `Heading level skipped: expected h${prevDepth + 1} or lower, found h${depth}`,
				});
			}

			prevDepth = depth;
		}
	},
};
