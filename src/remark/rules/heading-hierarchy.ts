/**
 * Remark-lint rule: changeset-heading-hierarchy
 *
 * Validates heading structure in changeset files:
 * - No h1 headings allowed
 * - Headings must start at h2
 * - No depth skips (e.g., h2 → h4 is invalid)
 *
 */

import type { Heading, Root } from "mdast";
import { lintRule } from "unified-lint-rule";
import { visit } from "unist-util-visit";

export const HeadingHierarchyRule = lintRule("remark-lint:changeset-heading-hierarchy", (tree: Root, file) => {
	let prevDepth = 0;

	visit(tree, "heading", (node: Heading) => {
		if (node.depth === 1) {
			file.message("h1 headings are not allowed in changeset files", node);
			return;
		}

		if (prevDepth > 0 && node.depth > prevDepth + 1) {
			file.message(`Heading level skipped: expected h${prevDepth + 1} or lower, found h${node.depth}`, node);
		}

		prevDepth = node.depth;
	});
});
