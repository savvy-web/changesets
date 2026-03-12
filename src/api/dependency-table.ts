/**
 * Class-based API for dependency table operations.
 *
 * Provides static methods for parsing, serializing, collapsing, sorting,
 * and aggregating dependency table data.
 *
 * @public
 */

import type { Table } from "mdast";

import type { DependencyTableRow } from "../schemas/dependency-table.js";
import {
	collapseDependencyRows,
	parseDependencyTable,
	serializeDependencyTable,
	serializeDependencyTableToMarkdown,
	sortDependencyRows,
} from "../utils/dependency-table.js";

export class DependencyTable {
	private constructor() {}

	static parse(tableNode: Table): DependencyTableRow[] {
		return parseDependencyTable(tableNode);
	}

	static serialize(rows: DependencyTableRow[]): Table {
		return serializeDependencyTable(rows);
	}

	static toMarkdown(rows: DependencyTableRow[]): string {
		return serializeDependencyTableToMarkdown(rows);
	}

	static collapse(rows: DependencyTableRow[]): DependencyTableRow[] {
		return collapseDependencyRows(rows);
	}

	static sort(rows: DependencyTableRow[]): DependencyTableRow[] {
		return sortDependencyRows(rows);
	}

	/** Collapse then sort. */
	static aggregate(rows: DependencyTableRow[]): DependencyTableRow[] {
		return sortDependencyRows(collapseDependencyRows(rows));
	}
}
