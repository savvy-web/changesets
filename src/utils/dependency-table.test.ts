import type { Table } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { describe, expect, it } from "vitest";

import type { DependencyTableRow } from "../schemas/dependency-table.js";
import {
	parseDependencyTable,
	serializeDependencyTable,
	serializeDependencyTableToMarkdown,
} from "./dependency-table.js";

/** Parse markdown into MDAST and extract first table node. */
function getTable(md: string): Table {
	const tree = unified().use(remarkParse).use(remarkGfm).parse(md);
	const table = tree.children.find((n) => n.type === "table");
	if (!table) throw new Error("No table found in markdown");
	return table as Table;
}

const VALID_TABLE = `| Dependency | Type | Action | From | To |
| --- | --- | --- | --- | --- |
| typescript | devDependency | updated | ^5.4.0 | ^5.6.0 |
| new-pkg | dependency | added | \u2014 | ^1.0.0 |
| old-pkg | dependency | removed | ^2.0.0 | \u2014 |`;

describe("parseDependencyTable", () => {
	it("parses a valid table into typed rows", () => {
		const rows = parseDependencyTable(getTable(VALID_TABLE));
		expect(rows).toHaveLength(3);
		expect(rows[0]).toEqual({
			dependency: "typescript",
			type: "devDependency",
			action: "updated",
			from: "^5.4.0",
			to: "^5.6.0",
		});
		expect(rows[1].action).toBe("added");
		expect(rows[1].from).toBe("\u2014");
		expect(rows[2].action).toBe("removed");
		expect(rows[2].to).toBe("\u2014");
	});

	it("is case-insensitive for column headers", () => {
		const md = `| dependency | type | action | from | to |
| --- | --- | --- | --- | --- |
| foo | dependency | updated | 1.0.0 | 2.0.0 |`;
		const rows = parseDependencyTable(getTable(md));
		expect(rows).toHaveLength(1);
	});

	it("throws on wrong number of columns", () => {
		const md = `| Dependency | Type | Action |
| --- | --- | --- |
| foo | dependency | updated |`;
		expect(() => parseDependencyTable(getTable(md))).toThrow(/columns/i);
	});

	it("throws on wrong column names", () => {
		const md = `| Package | Kind | Action | From | To |
| --- | --- | --- | --- | --- |
| foo | dependency | updated | 1.0.0 | 2.0.0 |`;
		expect(() => parseDependencyTable(getTable(md))).toThrow(/columns/i);
	});

	it("throws on invalid type value", () => {
		const md = `| Dependency | Type | Action | From | To |
| --- | --- | --- | --- | --- |
| foo | devDep | updated | 1.0.0 | 2.0.0 |`;
		expect(() => parseDependencyTable(getTable(md))).toThrow();
	});

	it("throws on empty table (header only)", () => {
		const md = `| Dependency | Type | Action | From | To |
| --- | --- | --- | --- | --- |`;
		expect(() => parseDependencyTable(getTable(md))).toThrow();
	});
});

describe("serializeDependencyTable", () => {
	it("produces a valid MDAST table node", () => {
		const rows: DependencyTableRow[] = [
			{ dependency: "foo", type: "dependency", action: "updated", from: "1.0.0", to: "2.0.0" },
		];
		const table = serializeDependencyTable(rows);
		expect(table.type).toBe("table");
		// Header row + 1 data row
		expect(table.children).toHaveLength(2);
	});

	it("round-trips through parse", () => {
		const original: DependencyTableRow[] = [
			{ dependency: "typescript", type: "devDependency", action: "updated", from: "^5.4.0", to: "^5.6.0" },
			{ dependency: "new-pkg", type: "dependency", action: "added", from: "\u2014", to: "^1.0.0" },
		];
		const table = serializeDependencyTable(original);
		const parsed = parseDependencyTable(table);
		expect(parsed).toEqual(original);
	});
});

describe("serializeDependencyTableToMarkdown", () => {
	it("produces valid markdown table string", () => {
		const rows: DependencyTableRow[] = [
			{ dependency: "foo", type: "dependency", action: "updated", from: "1.0.0", to: "2.0.0" },
		];
		const md = serializeDependencyTableToMarkdown(rows);
		expect(md).toMatch(/\|\s*Dependency\s*\|/);
		expect(md).toMatch(/\|\s*foo\s*\|/);
	});
});
