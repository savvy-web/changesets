/**
 * Dependency table utilities for parsing, serializing, collapsing, and sorting
 * dependency table rows between MDAST table nodes and typed representations.
 *
 * @internal
 */

import { Schema } from "effect";
import type { Table, TableCell, TableRow } from "mdast";
import { toString as mdastToString } from "mdast-util-to-string";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import { unified } from "unified";

import type { DependencyTableRow } from "../schemas/dependency-table.js";
import { DependencyTableRowSchema } from "../schemas/dependency-table.js";

const COLUMN_HEADERS = ["Dependency", "Type", "Action", "From", "To"] as const;
const COLUMN_KEYS: readonly (keyof DependencyTableRow)[] = ["dependency", "type", "action", "from", "to"] as const;

const decode = Schema.decodeUnknownSync(DependencyTableRowSchema);

/**
 * Parse an MDAST table node into validated dependency table rows.
 *
 * @param table - An MDAST Table node (from remark-gfm)
 * @returns Array of validated DependencyTableRow objects
 * @throws If table structure or cell values are invalid
 */
export function parseDependencyTable(table: Table): DependencyTableRow[] {
	const rows = table.children;
	if (rows.length < 2) {
		throw new Error("Dependency table must have at least one data row");
	}

	// Validate header row
	const headerRow = rows[0];
	const headers = headerRow.children.map((cell) => mdastToString(cell).trim().toLowerCase());
	const expected = COLUMN_HEADERS.map((h) => h.toLowerCase());

	if (headers.length !== expected.length || !headers.every((h, i) => h === expected[i])) {
		throw new Error(`Table must have columns: ${COLUMN_HEADERS.join(", ")}. Got: ${headers.join(", ")}`);
	}

	// Parse data rows
	const result: DependencyTableRow[] = [];
	for (let i = 1; i < rows.length; i++) {
		const cells = rows[i].children;
		const raw: Record<string, string> = {};
		for (let c = 0; c < COLUMN_KEYS.length; c++) {
			raw[COLUMN_KEYS[c]] = mdastToString(cells[c]).trim();
		}
		result.push(decode(raw));
	}

	return result;
}

/** Create a table cell with a text node. */
function makeCell(text: string): TableCell {
	return {
		type: "tableCell",
		children: [{ type: "text", value: text }],
	};
}

/** Create a table row from an array of cell texts. */
function makeRow(texts: string[]): TableRow {
	return {
		type: "tableRow",
		children: texts.map(makeCell),
	};
}

/**
 * Serialize dependency table rows into an MDAST Table node.
 *
 * @param rows - Array of DependencyTableRow objects
 * @returns An MDAST Table node
 */
export function serializeDependencyTable(rows: DependencyTableRow[]): Table {
	const headerRow = makeRow([...COLUMN_HEADERS]);
	const dataRows = rows.map((row) => makeRow(COLUMN_KEYS.map((key) => row[key])));

	return {
		type: "table",
		children: [headerRow, ...dataRows],
	};
}

/**
 * Serialize dependency table rows to a markdown table string.
 *
 * @param rows - Array of DependencyTableRow objects
 * @returns Markdown table string
 */
export function serializeDependencyTableToMarkdown(rows: DependencyTableRow[]): string {
	const table = serializeDependencyTable(rows);
	const tree = { type: "root" as const, children: [table] };
	return unified().use(remarkGfm).use(remarkStringify).stringify(tree).trim();
}

// Stubs for Task 3 — collapse & sort (imported by test file)
export function collapseDependencyRows(_rows: DependencyTableRow[]): DependencyTableRow[] {
	throw new Error("Not implemented — see Task 3");
}

export function sortDependencyRows(_rows: DependencyTableRow[]): DependencyTableRow[] {
	throw new Error("Not implemented — see Task 3");
}
