/**
 * Section-aware changeset summary parser.
 *
 * Parses changeset summaries that contain h2 headings into structured
 * sections mapped to categories.
 *
 */

import type { Heading, Root, RootContent } from "mdast";

import { fromHeading } from "../categories/index.js";
import type { SectionCategory } from "../categories/types.js";
import { parseMarkdown, stringifyMarkdown } from "./remark-pipeline.js";

/**
 * A parsed section from a changeset summary.
 */
export interface ParsedSection {
	/** The resolved category for this section */
	category: SectionCategory;
	/** The original heading text */
	heading: string;
	/** The markdown content under this heading */
	content: string;
}

/**
 * A fully parsed changeset with optional preamble and sections.
 */
export interface ParsedChangeset {
	/** Content before any h2 heading (if present) */
	preamble?: string;
	/** Sections identified by h2 headings */
	sections: ParsedSection[];
}

/**
 * Parse a changeset summary into structured sections.
 *
 * If the summary contains h2 (`##`) headings, they are mapped to categories
 * via {@link fromHeading}. Content between headings becomes the section content.
 * Content before the first h2 becomes the preamble.
 *
 * If no h2 headings are present, the entire content is returned as the preamble
 * with an empty sections array (backward-compatible flat-text mode).
 *
 * @param summary - The changeset summary markdown
 * @returns Parsed sections and optional preamble
 */
export function parseChangesetSections(summary: string): ParsedChangeset {
	const tree = parseMarkdown(summary);

	// Find indices of all h2 headings
	const h2Indices: number[] = [];
	for (let i = 0; i < tree.children.length; i++) {
		const node = tree.children[i];
		if (node.type === "heading" && (node as Heading).depth === 2) {
			h2Indices.push(i);
		}
	}

	// No h2 headings → flat-text mode
	if (h2Indices.length === 0) {
		return {
			preamble: summary.trim(),
			sections: [],
		};
	}

	// Extract preamble (content before the first h2)
	const result: ParsedChangeset = { sections: [] };
	if (h2Indices[0] > 0) {
		const preambleNodes = tree.children.slice(0, h2Indices[0]);
		result.preamble = stringifyAstSlice(preambleNodes);
	}

	// Extract each section
	for (let i = 0; i < h2Indices.length; i++) {
		const headingIndex = h2Indices[i];
		const headingNode = tree.children[headingIndex] as Heading;
		const headingText = extractHeadingText(headingNode);

		// Content extends from after the heading to the next h2 (or end)
		const nextIndex = i + 1 < h2Indices.length ? h2Indices[i + 1] : tree.children.length;
		const contentNodes = tree.children.slice(headingIndex + 1, nextIndex);
		const content = stringifyAstSlice(contentNodes);

		const category = fromHeading(headingText);
		if (category) {
			result.sections.push({ category, heading: headingText, content });
		}
		// Unknown headings are silently skipped (validation is Layer 1's job)
	}

	return result;
}

/**
 * Extract plain text from a heading node.
 */
function extractHeadingText(heading: Heading): string {
	// Simple extraction: concatenate text nodes
	let text = "";
	for (const child of heading.children) {
		if (child.type === "text") {
			text += child.value;
		} else if ("children" in child) {
			// Handle nested inline elements (e.g., emphasis, strong)
			for (const grandchild of child.children as Array<{ type: string; value?: string }>) {
				if (grandchild.type === "text" && grandchild.value) {
					text += grandchild.value;
				}
			}
		}
	}
	return text;
}

/**
 * Stringify a slice of AST nodes back to markdown.
 */
function stringifyAstSlice(nodes: RootContent[]): string {
	if (nodes.length === 0) return "";
	const root: Root = { type: "root", children: nodes };
	return stringifyMarkdown(root).trim();
}
