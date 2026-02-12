/**
 * Remark transform: convert inline issue links to reference-style links.
 *
 * Converts `[#N](url)` inline links to `[#N]` reference-style links with
 * link definitions at the end of each version block. This improves
 * source markdown readability.
 */

import type { Definition, Link, LinkReference, Root } from "mdast";
import type { Plugin } from "unified";
import { SKIP, visit } from "unist-util-visit";
import { getVersionBlocks } from "../../utils/version-blocks.js";

/** Pattern matching issue numbers like `#123`. */
const ISSUE_RE = /^#\d+$/;

/**
 * Convert inline issue links to reference-style links with definitions
 * at the end of each version block.
 */
export const IssueLinkRefsPlugin: Plugin<[], Root> = () => {
	return (tree: Root) => {
		const blocks = getVersionBlocks(tree);

		// Process blocks in reverse so insertions don't shift earlier indices
		for (let b = blocks.length - 1; b >= 0; b--) {
			const block = blocks[b];
			const definitions = new Map<string, { label: string; url: string }>();

			// Walk link nodes in this block and convert issue links
			for (let i = block.startIndex; i < block.endIndex; i++) {
				const node = tree.children[i];

				visit(node, "link", (linkNode: Link, index, parent) => {
					if (!parent || index === undefined) return;

					// Check if link text is an issue reference
					if (linkNode.children.length !== 1 || linkNode.children[0].type !== "text") return;
					const text = linkNode.children[0].value;
					if (!ISSUE_RE.test(text)) return;

					// Collect definition
					const label = text;
					if (!definitions.has(label)) {
						definitions.set(label, { label, url: linkNode.url });
					}

					// Replace link with linkReference
					const ref: LinkReference = {
						type: "linkReference",
						identifier: label,
						label,
						referenceType: "full",
						children: [{ type: "text", value: label }],
					};

					parent.children[index] = ref;
					return SKIP;
				});
			}

			if (definitions.size === 0) continue;

			// Sort definitions numerically
			const sorted = [...definitions.values()].sort((a, b) => {
				const aNum = Number.parseInt(a.label.slice(1), 10);
				const bNum = Number.parseInt(b.label.slice(1), 10);
				return aNum - bNum;
			});

			// Create definition nodes
			const defNodes: Definition[] = sorted.map((def) => ({
				type: "definition",
				identifier: def.label,
				label: def.label,
				url: def.url,
			}));

			// Insert at end of version block
			tree.children.splice(block.endIndex, 0, ...defNodes);
		}
	};
};
