/**
 * Remark-lint rule: changeset-required-sections
 *
 * Validates that all h2 headings in changeset files match a known
 * category heading from the category system. Reports unrecognized
 * headings with the list of valid options.
 *
 */

import type { Heading, Root } from "mdast";
import { toString as nodeToString } from "mdast-util-to-string";
import { lintRule } from "unified-lint-rule";
import { visit } from "unist-util-visit";

import { allHeadings, isValidHeading } from "../categories/index.js";

const requiredSections = lintRule("remark-lint:changeset-required-sections", (tree: Root, file) => {
	visit(tree, "heading", (node: Heading) => {
		if (node.depth !== 2) {
			return;
		}

		const text = nodeToString(node);

		if (!isValidHeading(text)) {
			file.message(`Unknown section "${text}". Valid sections: ${allHeadings().join(", ")}`, node);
		}
	});
});

export default requiredSections;
