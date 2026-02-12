/**
 * Remark transform: reorder h3 sections by category priority.
 *
 * Sorts sections within each version block so that Breaking Changes
 * appear first (priority 1) and Other appears last (priority 13).
 */

import type { Root, RootContent } from "mdast";
import type { Plugin } from "unified";

import { fromHeading } from "../categories/index.js";
import { getBlockSections, getHeadingText, getVersionBlocks } from "../utils/version-blocks.js";

/** Default priority for unrecognized headings (sorts after all known categories). */
const UNKNOWN_PRIORITY = 999;

/**
 * Reorder h3 sections within each version block by category priority.
 */
const reorderSections: Plugin<[], Root> = () => {
	return (tree: Root) => {
		const blocks = getVersionBlocks(tree);

		// Process blocks in reverse so index changes don't affect earlier blocks
		for (let b = blocks.length - 1; b >= 0; b--) {
			const block = blocks[b];
			const sections = getBlockSections(tree, block);
			if (sections.length <= 1) continue;

			// Collect preamble nodes (content before first h3)
			const preamble: RootContent[] = [];
			for (let i = block.startIndex; i < block.endIndex; i++) {
				if (i < sections[0].headingIndex) {
					preamble.push(tree.children[i]);
				} else {
					break;
				}
			}

			// Sort sections by category priority
			const sorted = [...sections].sort((a, b) => {
				const aPriority = fromHeading(getHeadingText(a.heading))?.priority ?? UNKNOWN_PRIORITY;
				const bPriority = fromHeading(getHeadingText(b.heading))?.priority ?? UNKNOWN_PRIORITY;
				return aPriority - bPriority;
			});

			// Check if already in order
			const alreadySorted = sorted.every((s, i) => s.headingIndex === sections[i].headingIndex);
			if (alreadySorted) continue;

			// Rebuild the block: preamble + sorted sections
			const newChildren: RootContent[] = [...preamble];
			for (const section of sorted) {
				newChildren.push(section.heading, ...section.contentNodes);
			}

			// Replace block content in tree
			const blockLength = block.endIndex - block.startIndex;
			tree.children.splice(block.startIndex, blockLength, ...newChildren);
		}
	};
};

export default reorderSections;
