/**
 * Remark transform: normalize markdown formatting.
 *
 * Final cleanup pass that removes:
 * - Empty sections (h3 heading with no content before next heading or end)
 * - Empty list nodes (lists with zero items, e.g. after dedup)
 */

import type { Heading, List, Root } from "mdast";
import { toString as mdastToString } from "mdast-util-to-string";
import type { Plugin } from "unified";

import { getVersionBlocks } from "../utils/version-blocks.js";

/**
 * Check if a node is an h2 or h3 heading.
 */
function isHeading(node: { type: string }, depths: number[]): node is Heading {
	return node.type === "heading" && depths.includes((node as Heading).depth);
}

/**
 * Remove empty sections and empty lists from the document.
 */
const normalizeFormat: Plugin<[], Root> = () => {
	return (tree: Root) => {
		const blocks = getVersionBlocks(tree);

		// Collect indices to remove (empty sections, empty lists)
		const indicesToRemove = new Set<number>();

		for (const block of blocks) {
			for (let i = block.startIndex; i < block.endIndex; i++) {
				const node = tree.children[i];

				// Remove empty lists
				if (node.type === "list" && (node as List).children.length === 0) {
					indicesToRemove.add(i);
					continue;
				}

				// Detect empty sections: h3 followed immediately by h2/h3 or end of block
				if (!isHeading(node, [3])) continue;

				// Check if the next non-empty content is another heading or end of block
				let hasContent = false;
				for (let j = i + 1; j < block.endIndex; j++) {
					const next = tree.children[j];

					// Skip whitespace-only paragraphs
					if (next.type === "paragraph" && mdastToString(next).trim() === "") {
						indicesToRemove.add(j);
						continue;
					}

					// If next real node is a heading, this section is empty
					if (isHeading(next, [2, 3])) break;

					// Found real content
					hasContent = true;
					break;
				}

				if (!hasContent) {
					indicesToRemove.add(i);
				}
			}
		}

		// Remove in reverse order to preserve indices
		const sorted = [...indicesToRemove].sort((a, b) => b - a);
		for (const idx of sorted) {
			tree.children.splice(idx, 1);
		}
	};
};

export default normalizeFormat;
