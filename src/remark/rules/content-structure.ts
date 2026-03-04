/**
 * Remark-lint rule: changeset-content-structure
 *
 * Validates content quality in changeset files:
 * - Sections must not be empty (h2 followed immediately by another h2 or EOF)
 * - Code blocks must have a language identifier
 * - List items should have meaningful content (not empty)
 *
 */

import type { Code, Heading, ListItem, Root } from "mdast";
import { toString as nodeToString } from "mdast-util-to-string";
import { lintRule } from "unified-lint-rule";
import { visit } from "unist-util-visit";
import { RULE_DOCS } from "../../constants.js";

export const ContentStructureRule = lintRule("remark-lint:changeset-content-structure", (tree: Root, file) => {
	// Check for empty sections (h2 followed by h2 or end of file)
	visit(tree, "heading", (node: Heading, index, parent) => {
		if (node.depth !== 2 || parent == null || index == null) {
			return;
		}

		const next = parent.children[index + 1];
		if (!next || (next.type === "heading" && (next as Heading).depth === 2)) {
			file.message(
				`Empty section: heading has no content before the next section or end of file. Add a list of changes (e.g., "- Added feature X") under this heading, or remove the empty heading. See: ${RULE_DOCS.CSH003}`,
				node,
			);
		}
	});

	// Check code blocks for language identifier
	visit(tree, "code", (node: Code) => {
		if (!node.lang) {
			file.message(
				`Code block is missing a language identifier. Add a language after the opening fence (e.g., \`\`\`ts, \`\`\`json, \`\`\`bash). See: ${RULE_DOCS.CSH003}`,
				node,
			);
		}
	});

	// Check list items for content
	visit(tree, "listItem", (node: ListItem) => {
		const text = nodeToString(node).trim();
		if (!text) {
			file.message(
				`Empty list item. Each list item must contain descriptive text (e.g., "- Fixed login timeout issue"). See: ${RULE_DOCS.CSH003}`,
				node,
			);
		}
	});
});
