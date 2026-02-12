/**
 * Remark transform: aggregate contributor attributions.
 *
 * Extracts inline `Thanks [@user](url)!` or `Thanks @user!` text from
 * list items and appends a deduplicated contributors paragraph at the
 * end of each version block.
 *
 * After parsing, `Thanks [@user](url)!` becomes three sibling nodes
 * inside a paragraph:
 * 1. text node ending with "Thanks "
 * 2. link node with child text "\@user"
 * 3. text node "!"
 *
 * Plain `Thanks @user!` remains a single text node.
 */

import type { Link, Paragraph, PhrasingContent, Root, Text } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

import { getVersionBlocks } from "../utils/version-blocks.js";

interface Contributor {
	username: string;
	url: string | undefined;
}

/** Pattern matching `Thanks @user!` at end of text. */
const ATTRIBUTION_PLAIN_RE = /\s*Thanks @(\w[\w-]*)!$/;

/**
 * Try to extract a linked attribution from the end of a paragraph's children.
 * Pattern: text "...Thanks " + link "\@user" + text "!"
 *
 * @returns The contributor if found, or undefined
 */
function extractLinkedAttribution(
	children: PhrasingContent[],
): { contributor: Contributor; removeFrom: number } | undefined {
	if (children.length < 3) return undefined;

	const last = children[children.length - 1];
	const secondLast = children[children.length - 2];
	const thirdLast = children[children.length - 3];

	// Last must be text "!"
	if (last.type !== "text" || last.value !== "!") return undefined;

	// Second-to-last must be a link with child text starting with "@"
	if (secondLast.type !== "link") return undefined;
	const linkNode = secondLast as Link;
	if (linkNode.children.length !== 1 || linkNode.children[0].type !== "text") return undefined;
	const linkText = linkNode.children[0].value;
	if (!linkText.startsWith("@")) return undefined;
	const username = linkText.slice(1);

	// Third-to-last must be text ending with "Thanks " (possibly with leading space)
	if (thirdLast.type !== "text") return undefined;
	const textNode = thirdLast as Text;
	if (!textNode.value.match(/\s*Thanks $/)) return undefined;

	return {
		contributor: { username, url: linkNode.url },
		removeFrom: children.length - 3,
	};
}

/**
 * Extract inline contributor attributions and aggregate them into
 * a summary paragraph at the end of each version block.
 */
const contributorFootnotes: Plugin<[], Root> = () => {
	return (tree: Root) => {
		const blocks = getVersionBlocks(tree);

		// Process blocks in reverse so insertions don't shift earlier indices
		for (let b = blocks.length - 1; b >= 0; b--) {
			const block = blocks[b];
			const contributors = new Map<string, Contributor>();

			// Walk paragraphs inside list items in this block
			for (let i = block.startIndex; i < block.endIndex; i++) {
				const node = tree.children[i];
				if (node.type !== "list") continue;

				visit(node, "paragraph", (para: Paragraph) => {
					// Try linked attribution: text + link + "!"
					const linked = extractLinkedAttribution(para.children);
					if (linked) {
						const key = linked.contributor.username.toLowerCase();
						if (!contributors.has(key)) {
							contributors.set(key, linked.contributor);
						}
						// Remove the "Thanks " text suffix and the link + "!" nodes
						const textNode = para.children[linked.removeFrom] as Text;
						textNode.value = textNode.value.replace(/\s*Thanks $/, "");
						para.children.splice(linked.removeFrom + 1, 2);
						// Remove the text node too if it became empty
						if (textNode.value === "") {
							para.children.splice(linked.removeFrom, 1);
						}
						return;
					}

					// Try plain attribution: text ending with "Thanks @user!"
					const last = para.children[para.children.length - 1];
					if (last?.type === "text") {
						const textNode = last as Text;
						const match = textNode.value.match(ATTRIBUTION_PLAIN_RE);
						if (match) {
							const username = match[1];
							const key = username.toLowerCase();
							if (!contributors.has(key)) {
								contributors.set(key, { username, url: undefined });
							}
							textNode.value = textNode.value.replace(ATTRIBUTION_PLAIN_RE, "");
						}
					}
				});
			}

			if (contributors.size === 0) continue;

			// Build contributors paragraph
			const sorted = [...contributors.values()].sort((a, b) =>
				a.username.toLowerCase().localeCompare(b.username.toLowerCase()),
			);

			const phrasingChildren: (Text | Link)[] = [];
			phrasingChildren.push({ type: "text", value: "Thanks to " });

			for (let i = 0; i < sorted.length; i++) {
				const contrib = sorted[i];

				if (i > 0 && sorted.length > 2) {
					phrasingChildren.push({ type: "text", value: ", " });
				}
				if (i > 0 && i === sorted.length - 1) {
					phrasingChildren.push({
						type: "text",
						value: sorted.length === 2 ? " and " : "and ",
					});
				}

				if (contrib.url) {
					phrasingChildren.push({
						type: "link",
						url: contrib.url,
						children: [{ type: "text", value: `@${contrib.username}` }],
					});
				} else {
					phrasingChildren.push({ type: "text", value: `@${contrib.username}` });
				}
			}

			phrasingChildren.push({
				type: "text",
				value: " for their contributions!",
			});

			const paragraph: Paragraph = {
				type: "paragraph",
				children: phrasingChildren,
			};

			// Insert at end of version block
			tree.children.splice(block.endIndex, 0, paragraph);
		}
	};
};

export default contributorFootnotes;
