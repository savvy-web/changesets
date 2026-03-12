/**
 * Remark transform: aggregate dependency tables.
 *
 * Consolidates all `### Dependencies` sections within each version block
 * into a single section with a merged, collapsed, and sorted table.
 *
 * Must run before MergeSectionsPlugin (index 0 in transform preset).
 */

import type { Heading, Root, RootContent, Table } from "mdast";
import type { Plugin } from "unified";

import type { DependencyTableRow } from "../../schemas/dependency-table.js";
import {
	collapseDependencyRows,
	parseDependencyTable,
	serializeDependencyTable,
	sortDependencyRows,
} from "../../utils/dependency-table.js";
import { getBlockSections, getHeadingText, getVersionBlocks } from "../../utils/version-blocks.js";

/**
 * Aggregate all dependency tables within each version block into one.
 *
 * Collects rows from all `### Dependencies` sections within a version block,
 * collapses duplicate entries, sorts the result, and replaces all duplicate
 * sections with a single merged section. If all rows collapse to nothing
 * (e.g., added + removed = net zero), the section is dropped entirely.
 *
 * @public
 */
export const AggregateDependencyTablesPlugin: Plugin<[], Root> = () => {
	return (tree: Root) => {
		const blocks = getVersionBlocks(tree);

		// Process blocks in reverse to avoid index shifts
		for (let b = blocks.length - 1; b >= 0; b--) {
			const sections = getBlockSections(tree, blocks[b]);
			const depSections = sections.filter((s) => getHeadingText(s.heading).toLowerCase() === "dependencies");

			if (depSections.length === 0) continue;

			// Collect all rows from all dependency tables
			const allRows: DependencyTableRow[] = [];
			const legacyContent: RootContent[] = [];

			for (const section of depSections) {
				for (const node of section.contentNodes) {
					if (node.type === "table") {
						try {
							const rows = parseDependencyTable(node as Table);
							allRows.push(...rows);
						} catch {
							// If table doesn't parse, treat as legacy content
							legacyContent.push(node);
						}
					} else {
						legacyContent.push(node);
					}
				}
			}

			// Collapse and sort
			const collapsed = sortDependencyRows(collapseDependencyRows(allRows));

			// Collect all indices to remove (headings + content) in reverse order
			const indicesToRemove: number[] = [];
			for (const section of depSections) {
				indicesToRemove.push(section.headingIndex);
				for (let c = 0; c < section.contentNodes.length; c++) {
					indicesToRemove.push(section.headingIndex + 1 + c);
				}
			}
			indicesToRemove.sort((a, b) => b - a);

			// Remove all dependency sections
			for (const idx of indicesToRemove) {
				tree.children.splice(idx, 1);
			}

			// If no rows left after collapse and no legacy content, skip (section drops naturally)
			if (collapsed.length === 0 && legacyContent.length === 0) continue;

			// Build replacement section at the position of the first dep section
			const insertAt = depSections[0].headingIndex;
			const newNodes: RootContent[] = [];

			// Re-create the heading
			const heading: Heading = {
				type: "heading",
				depth: 3,
				children: [{ type: "text", value: "Dependencies" }],
			};
			newNodes.push(heading);

			// Add table if there are rows
			if (collapsed.length > 0) {
				newNodes.push(serializeDependencyTable(collapsed));
			}

			// Add legacy content after the table
			newNodes.push(...legacyContent);

			tree.children.splice(insertAt, 0, ...newNodes);
		}
	};
};
