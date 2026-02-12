import type { Rule } from "markdownlint";

import { allHeadings, isValidHeading } from "../../categories/index.js";
import { getHeadingLevel, getHeadingText } from "./utils.js";

/**
 * markdownlint rule: changeset-required-sections (CSH002)
 *
 * Validates that all h2 headings in changeset files match a known
 * category heading from the category system. Reports unrecognized
 * headings with the list of valid options.
 */
export const RequiredSectionsRule: Rule = {
	names: ["changeset-required-sections", "CSH002"],
	description: "Section headings must match known changeset categories",
	tags: ["changeset"],
	parser: "micromark",
	function: function CSH002(params, onError) {
		for (const token of params.parsers.micromark.tokens) {
			if (token.type !== "atxHeading") {
				continue;
			}

			if (getHeadingLevel(token) !== 2) {
				continue;
			}

			const text = getHeadingText(token);

			if (!isValidHeading(text)) {
				onError({
					lineNumber: token.startLine,
					detail: `Unknown section "${text}". Valid sections: ${allHeadings().join(", ")}`,
				});
			}
		}
	},
};
