/**
 * Remark-lint rule: changeset-uncategorized-content
 *
 * Detects content that appears before the first h2 heading in a changeset file.
 * All content must be placed under a categorized section (## heading) to ensure
 * proper changelog generation and section ordering.
 *
 */

import type { Heading, Root, RootContent } from "mdast";
import { lintRule } from "unified-lint-rule";

/** Node types that are considered non-content (whitespace / formatting only). */
const IGNORED_TYPES = new Set(["html"]);

function isContentNode(node: RootContent): boolean {
	if (node.type === "heading") {
		return false;
	}
	return !IGNORED_TYPES.has(node.type);
}

export const UncategorizedContentRule = lintRule("remark-lint:changeset-uncategorized-content", (tree: Root, file) => {
	for (const node of tree.children) {
		// Stop at the first h2 — everything after is categorized
		if (node.type === "heading" && (node as Heading).depth === 2) {
			break;
		}

		if (isContentNode(node)) {
			file.message("Content must be placed under a category heading (## heading)", node);
		}
	}
});
