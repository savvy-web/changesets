/**
 * Remark-lint rule: changeset-dependency-table-format (CSH005)
 *
 * Validates that ## Dependencies sections in changeset files contain
 * a properly structured markdown table with correct columns, types,
 * actions, and version/sentinel values.
 */

import type { Heading, Root, RootContent, Table } from "mdast";
import { toString as nodeToString } from "mdast-util-to-string";
import { lintRule } from "unified-lint-rule";
import { visit } from "unist-util-visit";
import { RULE_DOCS } from "../../constants.js";
import { parseDependencyTable } from "../../utils/dependency-table.js";

const EM_DASH = "\u2014";

export const DependencyTableFormatRule = lintRule(
	"remark-lint:changeset-dependency-table-format",
	(tree: Root, file) => {
		visit(tree, "heading", (node: Heading, index: number | undefined) => {
			if (node.depth !== 2) return;
			if (nodeToString(node).toLowerCase() !== "dependencies") return;
			if (index === undefined) return;

			// Collect content nodes until next heading or end
			const content: RootContent[] = [];
			for (let i = index + 1; i < tree.children.length; i++) {
				const child = tree.children[i];
				if (child.type === "heading") break;
				content.push(child);
			}

			// Must have exactly one table
			const tables = content.filter((n) => n.type === "table");
			if (tables.length === 0) {
				file.message(
					`Dependencies section must contain a table, not a list or paragraph. See: ${RULE_DOCS.CSH005}`,
					node,
				);
				return;
			}

			const table = tables[0] as Table;

			// Validate structure via parseDependencyTable (handles column names,
			// types, and actions via Schema.decodeUnknownSync). Then do semantic
			// validation for from/to em-dash rules which the schema cannot enforce.
			try {
				const rows = parseDependencyTable(table);

				// Semantic validation: from/to must match action
				for (const row of rows) {
					if (row.action === "added" && row.from !== EM_DASH) {
						file.message(
							`'from' must be '\u2014' when action is 'added' (got '${row.from}'). See: ${RULE_DOCS.CSH005}`,
							table,
						);
					}

					if (row.action === "removed" && row.to !== EM_DASH) {
						file.message(
							`'to' must be '\u2014' when action is 'removed' (got '${row.to}'). See: ${RULE_DOCS.CSH005}`,
							table,
						);
					}
				}
			} catch (error) {
				file.message(`${error instanceof Error ? error.message : String(error)}. See: ${RULE_DOCS.CSH005}`, table);
			}
		});
	},
);
