/**
 * Remark transform: deduplicate list items within sections.
 *
 * Removes duplicate list items within each h3 section of a version block.
 * Comparison uses the plain text content of each list item.
 */

import type { List, Root } from "mdast";
import { toString as mdastToString } from "mdast-util-to-string";
import type { Plugin } from "unified";

import { getBlockSections, getVersionBlocks } from "../utils/version-blocks.js";

/**
 * Remove duplicate list items within each h3 section.
 *
 * Items are compared by their plain text content. If a list becomes
 * empty after deduplication, it is removed from the tree.
 */
const deduplicateItems: Plugin<[], Root> = () => {
	return (tree: Root) => {
		const blocks = getVersionBlocks(tree);

		for (const block of blocks) {
			const sections = getBlockSections(tree, block);

			for (const section of sections) {
				for (const node of section.contentNodes) {
					if (node.type !== "list") continue;

					const list = node as List;
					const seen = new Set<string>();
					list.children = list.children.filter((item) => {
						const text = mdastToString(item);
						if (seen.has(text)) return false;
						seen.add(text);
						return true;
					});
				}
			}
		}

		// Remove empty lists from tree
		tree.children = tree.children.filter((node) => {
			if (node.type === "list") {
				return (node as List).children.length > 0;
			}
			return true;
		});
	};
};

export default deduplicateItems;
