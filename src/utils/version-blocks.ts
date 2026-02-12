/**
 * Utilities for extracting version blocks and sections from CHANGELOG ASTs.
 *
 * A version block starts at an h2 heading (e.g., `## 1.2.0`) and extends
 * to the next h2 or end of document. h1 headings (package name) are skipped.
 *
 * @internal
 */

import type { Heading, Root, RootContent } from "mdast";
import { toString as mdastToString } from "mdast-util-to-string";

/**
 * A version block within a CHANGELOG document.
 */
export interface VersionBlock {
	/** Index of the h2 heading in root.children. */
	headingIndex: number;
	/** First content index after the heading. */
	startIndex: number;
	/** One past the last content index (next h2 or end of children). */
	endIndex: number;
}

/**
 * A section within a version block, delimited by h3 headings.
 */
export interface BlockSection {
	/** The h3 heading node. */
	heading: Heading;
	/** Absolute index of the h3 heading in root.children. */
	headingIndex: number;
	/** Content nodes between this h3 and the next h3/h2/end. */
	contentNodes: RootContent[];
}

/**
 * Extract all version blocks from a CHANGELOG AST.
 *
 * Version blocks are h2-level sections. h1 headings (package name) are
 * not considered version blocks.
 *
 * @param tree - The mdast root node
 * @returns Array of version blocks in document order
 */
export function getVersionBlocks(tree: Root): VersionBlock[] {
	const blocks: VersionBlock[] = [];

	for (let i = 0; i < tree.children.length; i++) {
		const node = tree.children[i];
		if (node.type === "heading" && (node as Heading).depth === 2) {
			blocks.push({
				headingIndex: i,
				startIndex: i + 1,
				endIndex: tree.children.length, // will be adjusted below
			});
		}
	}

	// Adjust endIndex for each block to stop at the next h2
	for (let i = 0; i < blocks.length - 1; i++) {
		blocks[i].endIndex = blocks[i + 1].headingIndex;
	}

	return blocks;
}

/**
 * Extract h3 sections within a version block.
 *
 * @param tree - The mdast root node
 * @param block - The version block to extract sections from
 * @returns Array of sections in document order
 */
export function getBlockSections(tree: Root, block: VersionBlock): BlockSection[] {
	const sections: BlockSection[] = [];

	for (let i = block.startIndex; i < block.endIndex; i++) {
		const node = tree.children[i];
		if (node.type === "heading" && (node as Heading).depth === 3) {
			sections.push({
				heading: node as Heading,
				headingIndex: i,
				contentNodes: [],
			});
		} else if (sections.length > 0) {
			sections[sections.length - 1].contentNodes.push(node);
		}
	}

	return sections;
}

/**
 * Get the plain text of a heading node.
 *
 * @param heading - The heading node
 * @returns The heading text
 */
export function getHeadingText(heading: Heading): string {
	return mdastToString(heading);
}
