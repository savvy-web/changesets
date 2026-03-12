# Dependency Table Format Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace bullet-list dependency entries with structured markdown tables in both changeset input files and CHANGELOG output, with aggregation across multiple changesets.

**Architecture:** Schema-driven approach using Effect Schema as the canonical representation for dependency table rows. Three pipeline layers are updated: remark-lint validation (Layer 1), changelog formatter (Layer 2), and remark transform aggregation (Layer 3). A shared utility module provides parse/serialize/collapse/sort functions used by all layers.

**Tech Stack:** Effect Schema, remark/unified (MDAST), remark-gfm (table parsing), markdownlint micromark API, Vitest

**Spec:** `docs/superpowers/specs/2026-03-12-dependency-table-format-design.md`

**Note:** Code samples use spaces for readability, but this project uses **tab indentation** (Biome convention). Run `pnpm lint:fix` after each implementation step to auto-convert. All commit messages must include DCO signoff: `Signed-off-by: C. Spencer Beggs <spencer@savvyweb.systems>`.

---

## Chunk 1: Schema & Utility Foundation

### Task 1: Dependency Table Schemas

**Files:**

- Create: `src/schemas/dependency-table.ts`
- Test: `src/schemas/dependency-table.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/schemas/dependency-table.test.ts`:

```typescript
import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
 DependencyActionSchema,
 DependencyTableRowSchema,
 DependencyTableSchema,
 DependencyTableTypeSchema,
 VersionOrEmptySchema,
} from "./dependency-table.js";

describe("DependencyTableTypeSchema", () => {
 const decode = Schema.decodeUnknownSync(DependencyTableTypeSchema);

 it("accepts valid dependency types", () => {
  for (const t of ["dependency", "devDependency", "peerDependency", "optionalDependency", "workspace", "config"]) {
   expect(decode(t)).toBe(t);
  }
 });

 it("rejects invalid types", () => {
  expect(() => decode("devDep")).toThrow();
  expect(() => decode("dependencies")).toThrow();
  expect(() => decode("")).toThrow();
 });
});

describe("DependencyActionSchema", () => {
 const decode = Schema.decodeUnknownSync(DependencyActionSchema);

 it("accepts valid actions", () => {
  for (const a of ["added", "updated", "removed"]) {
   expect(decode(a)).toBe(a);
  }
 });

 it("rejects invalid actions", () => {
  expect(() => decode("changed")).toThrow();
  expect(() => decode("")).toThrow();
 });
});

describe("VersionOrEmptySchema", () => {
 const decode = Schema.decodeUnknownSync(VersionOrEmptySchema);

 it("accepts em dash sentinel", () => {
  expect(decode("\u2014")).toBe("\u2014");
 });

 it("accepts semver versions", () => {
  expect(decode("1.0.0")).toBe("1.0.0");
  expect(decode("^5.4.0")).toBe("^5.4.0");
  expect(decode("~2.3.1")).toBe("~2.3.1");
 });

 it("accepts pre-release versions", () => {
  expect(decode("1.0.0-beta.1")).toBe("1.0.0-beta.1");
  expect(decode("^2.0.0-rc.3")).toBe("^2.0.0-rc.3");
 });

 it("accepts build metadata", () => {
  expect(decode("1.0.0+build.123")).toBe("1.0.0+build.123");
 });

 it("rejects invalid versions", () => {
  expect(() => decode("")).toThrow();
  expect(() => decode("latest")).toThrow();
  expect(() => decode("-")).toThrow(); // ASCII hyphen, not em dash
 });
});

describe("DependencyTableRowSchema", () => {
 const decode = Schema.decodeUnknownSync(DependencyTableRowSchema);

 it("accepts a valid updated row", () => {
  const row = decode({
   dependency: "typescript",
   type: "devDependency",
   action: "updated",
   from: "^5.4.0",
   to: "^5.6.0",
  });
  expect(row.dependency).toBe("typescript");
  expect(row.action).toBe("updated");
 });

 it("accepts a valid added row", () => {
  const row = decode({
   dependency: "new-pkg",
   type: "dependency",
   action: "added",
   from: "\u2014",
   to: "^1.0.0",
  });
  expect(row.action).toBe("added");
  expect(row.from).toBe("\u2014");
 });

 it("accepts a valid removed row", () => {
  const row = decode({
   dependency: "old-pkg",
   type: "dependency",
   action: "removed",
   from: "^2.0.0",
   to: "\u2014",
  });
  expect(row.action).toBe("removed");
  expect(row.to).toBe("\u2014");
 });

 it("accepts scoped package names", () => {
  const row = decode({
   dependency: "@savvy-web/changesets",
   type: "devDependency",
   action: "updated",
   from: "0.3.0",
   to: "0.4.0",
  });
  expect(row.dependency).toBe("@savvy-web/changesets");
 });

 it("rejects empty dependency name", () => {
  expect(() =>
   decode({
    dependency: "",
    type: "dependency",
    action: "updated",
    from: "1.0.0",
    to: "2.0.0",
   }),
  ).toThrow();
 });
});

describe("DependencyTableSchema", () => {
 const decode = Schema.decodeUnknownSync(DependencyTableSchema);

 it("accepts array with at least one row", () => {
  const rows = decode([
   {
    dependency: "foo",
    type: "dependency",
    action: "updated",
    from: "1.0.0",
    to: "2.0.0",
   },
  ]);
  expect(rows).toHaveLength(1);
 });

 it("rejects empty array", () => {
  expect(() => decode([])).toThrow();
 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/schemas/dependency-table.test.ts`
Expected: FAIL — cannot resolve `./dependency-table.js`

- [ ] **Step 3: Write minimal implementation**

Create `src/schemas/dependency-table.ts`:

```typescript
/**
 * Effect schemas for structured dependency table entries.
 *
 * These schemas define the canonical representation for dependency
 * changes tracked as markdown tables in changeset files and CHANGELOGs.
 */

import { Schema } from "effect";
import { NonEmptyString } from "./primitives.js";

/**
 * Valid dependency table actions.
 *
 * @public
 */
export const DependencyActionSchema = Schema.Literal("added", "updated", "removed");

/**
 * Inferred type for {@link DependencyActionSchema}.
 *
 * @public
 */
export type DependencyAction = typeof DependencyActionSchema.Type;

/**
 * Extended dependency types for table format.
 *
 * Unlike {@link DependencyTypeSchema} (which uses plural npm field names),
 * this uses singular forms and adds `workspace` and `config` types.
 *
 * @public
 */
export const DependencyTableTypeSchema = Schema.Literal(
 "dependency",
 "devDependency",
 "peerDependency",
 "optionalDependency",
 "workspace",
 "config",
);

/**
 * Inferred type for {@link DependencyTableTypeSchema}.
 *
 * @public
 */
export type DependencyTableType = typeof DependencyTableTypeSchema.Type;

/**
 * Version string or em dash (U+2014) sentinel for added/removed entries.
 *
 * @public
 */
export const VersionOrEmptySchema = Schema.String.pipe(
 Schema.pattern(/^(\u2014|[~^]?\d+\.\d+\.\d+[\w.+-]*)$/),
);

/**
 * Schema for a single dependency table row.
 *
 * @public
 */
export const DependencyTableRowSchema = Schema.Struct({
 /** Package or toolchain name. */
 dependency: NonEmptyString,
 /** Dependency type. */
 type: DependencyTableTypeSchema,
 /** Change action. */
 action: DependencyActionSchema,
 /** Previous version (em dash for added). */
 from: VersionOrEmptySchema,
 /** New version (em dash for removed). */
 to: VersionOrEmptySchema,
});

/**
 * Inferred type for {@link DependencyTableRowSchema}.
 *
 * @public
 */
export interface DependencyTableRow extends Schema.Schema.Type<typeof DependencyTableRowSchema> {}

/**
 * Schema for a dependency table (non-empty array of rows).
 *
 * @public
 */
export const DependencyTableSchema = Schema.Array(DependencyTableRowSchema).pipe(Schema.minItems(1));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/schemas/dependency-table.test.ts`
Expected: PASS — all schema tests green

- [ ] **Step 5: Commit**

```bash
git add src/schemas/dependency-table.ts src/schemas/dependency-table.test.ts
git commit -m "feat: add dependency table Effect schemas"
```

---

### Task 2: Dependency Table Utilities — Parse & Serialize

**Files:**

- Create: `src/utils/dependency-table.ts`
- Test: `src/utils/dependency-table.test.ts`

**Context:** MDAST table nodes have this structure:

- `Table` node with `children: TableRow[]`
- First `TableRow` is the header row with `children: TableCell[]`
- Each `TableCell` has `children` containing inline content (typically `Text` nodes)
- `remark-gfm` is required to parse tables — already configured in `src/utils/remark-pipeline.ts:24`

- [ ] **Step 1: Write the failing test for parse/serialize**

Create `src/utils/dependency-table.test.ts`:

```typescript
import type { Table } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { describe, expect, it } from "vitest";

import type { DependencyTableRow } from "../schemas/dependency-table.js";
import {
 collapseDependencyRows,
 parseDependencyTable,
 serializeDependencyTable,
 serializeDependencyTableToMarkdown,
 sortDependencyRows,
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
  expect(md).toContain("| Dependency |");
  expect(md).toContain("| foo |");
 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/utils/dependency-table.test.ts`
Expected: FAIL — cannot resolve `./dependency-table.js`

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/dependency-table.ts`:

```typescript
/**
 * Dependency table utilities for parsing, serializing, collapsing, and sorting
 * dependency table rows between MDAST table nodes and typed representations.
 *
 * @internal
 */

import type { Table, TableCell, TableRow } from "mdast";
import { Schema } from "effect";
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

 if (
  headers.length !== expected.length ||
  !headers.every((h, i) => h === expected[i])
 ) {
  throw new Error(
   `Table must have columns: ${COLUMN_HEADERS.join(", ")}. Got: ${headers.join(", ")}`,
  );
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
 const dataRows = rows.map((row) =>
  makeRow(COLUMN_KEYS.map((key) => row[key])),
 );

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
```

- [ ] **Step 4: Run test to verify parse/serialize passes**

Run: `pnpm vitest run src/utils/dependency-table.test.ts`
Expected: PASS — parse, serialize, round-trip, and error tests pass

- [ ] **Step 5: Commit**

```bash
git add src/utils/dependency-table.ts src/utils/dependency-table.test.ts
git commit -m "feat: add dependency table parse/serialize utilities"
```

---

### Task 3: Collapse & Sort Logic

**Files:**

- Modify: `src/utils/dependency-table.ts`
- Modify: `src/utils/dependency-table.test.ts`

- [ ] **Step 1: Write the failing tests for collapse and sort**

Append to `src/utils/dependency-table.test.ts`:

```typescript
describe("collapseDependencyRows", () => {
 it("collapses updated+updated to earliest from, latest to", () => {
  const rows: DependencyTableRow[] = [
   { dependency: "foo", type: "devDependency", action: "updated", from: "^1.0.0", to: "^1.1.0" },
   { dependency: "foo", type: "devDependency", action: "updated", from: "^1.1.0", to: "^1.2.0" },
  ];
  const result = collapseDependencyRows(rows);
  expect(result).toHaveLength(1);
  expect(result[0]).toEqual({
   dependency: "foo",
   type: "devDependency",
   action: "updated",
   from: "^1.0.0",
   to: "^1.2.0",
  });
 });

 it("collapses added+updated to added with final to", () => {
  const rows: DependencyTableRow[] = [
   { dependency: "foo", type: "dependency", action: "added", from: "\u2014", to: "^1.0.0" },
   { dependency: "foo", type: "dependency", action: "updated", from: "^1.0.0", to: "^1.1.0" },
  ];
  const result = collapseDependencyRows(rows);
  expect(result).toHaveLength(1);
  expect(result[0].action).toBe("added");
  expect(result[0].from).toBe("\u2014");
  expect(result[0].to).toBe("^1.1.0");
 });

 it("drops added+removed (net zero)", () => {
  const rows: DependencyTableRow[] = [
   { dependency: "foo", type: "dependency", action: "added", from: "\u2014", to: "^1.0.0" },
   { dependency: "foo", type: "dependency", action: "removed", from: "^1.0.0", to: "\u2014" },
  ];
  const result = collapseDependencyRows(rows);
  expect(result).toHaveLength(0);
 });

 it("collapses updated+removed to removed with original from", () => {
  const rows: DependencyTableRow[] = [
   { dependency: "foo", type: "dependency", action: "updated", from: "^1.0.0", to: "^1.1.0" },
   { dependency: "foo", type: "dependency", action: "removed", from: "^1.1.0", to: "\u2014" },
  ];
  const result = collapseDependencyRows(rows);
  expect(result).toHaveLength(1);
  expect(result[0].action).toBe("removed");
  expect(result[0].from).toBe("^1.0.0");
  expect(result[0].to).toBe("\u2014");
 });

 it("collapses removed+added to updated (re-added)", () => {
  const rows: DependencyTableRow[] = [
   { dependency: "foo", type: "dependency", action: "removed", from: "^1.0.0", to: "\u2014" },
   { dependency: "foo", type: "dependency", action: "added", from: "\u2014", to: "^2.0.0" },
  ];
  const result = collapseDependencyRows(rows);
  expect(result).toHaveLength(1);
  expect(result[0].action).toBe("updated");
  expect(result[0].from).toBe("^1.0.0");
  expect(result[0].to).toBe("^2.0.0");
 });

 it("keeps rows with different dependency+type keys separate", () => {
  const rows: DependencyTableRow[] = [
   { dependency: "foo", type: "dependency", action: "updated", from: "1.0.0", to: "2.0.0" },
   { dependency: "bar", type: "devDependency", action: "updated", from: "3.0.0", to: "4.0.0" },
  ];
  const result = collapseDependencyRows(rows);
  expect(result).toHaveLength(2);
 });

 it("handles contradictory removed+updated by keeping later entry", () => {
  const rows: DependencyTableRow[] = [
   { dependency: "foo", type: "dependency", action: "removed", from: "^1.0.0", to: "\u2014" },
   { dependency: "foo", type: "dependency", action: "updated", from: "^1.0.0", to: "^2.0.0" },
  ];
  const result = collapseDependencyRows(rows);
  expect(result).toHaveLength(1);
  expect(result[0].action).toBe("updated");
 });

 it("handles contradictory updated+added by keeping later entry", () => {
  const rows: DependencyTableRow[] = [
   { dependency: "foo", type: "dependency", action: "updated", from: "^1.0.0", to: "^2.0.0" },
   { dependency: "foo", type: "dependency", action: "added", from: "\u2014", to: "^3.0.0" },
  ];
  const result = collapseDependencyRows(rows);
  expect(result).toHaveLength(1);
  expect(result[0].action).toBe("added");
 });

 it("passes through single rows unchanged", () => {
  const rows: DependencyTableRow[] = [
   { dependency: "foo", type: "dependency", action: "updated", from: "1.0.0", to: "2.0.0" },
  ];
  const result = collapseDependencyRows(rows);
  expect(result).toEqual(rows);
 });
});

describe("sortDependencyRows", () => {
 it("sorts by action: removed, updated, added", () => {
  const rows: DependencyTableRow[] = [
   { dependency: "c", type: "dependency", action: "added", from: "\u2014", to: "1.0.0" },
   { dependency: "a", type: "dependency", action: "removed", from: "1.0.0", to: "\u2014" },
   { dependency: "b", type: "dependency", action: "updated", from: "1.0.0", to: "2.0.0" },
  ];
  const result = sortDependencyRows(rows);
  expect(result.map((r) => r.action)).toEqual(["removed", "updated", "added"]);
 });

 it("sorts by type alphabetically within same action", () => {
  const rows: DependencyTableRow[] = [
   { dependency: "a", type: "workspace", action: "updated", from: "1.0.0", to: "2.0.0" },
   { dependency: "b", type: "config", action: "updated", from: "1.0.0", to: "2.0.0" },
   { dependency: "c", type: "dependency", action: "updated", from: "1.0.0", to: "2.0.0" },
  ];
  const result = sortDependencyRows(rows);
  expect(result.map((r) => r.type)).toEqual(["config", "dependency", "workspace"]);
 });

 it("sorts by dependency name alphabetically within same action+type", () => {
  const rows: DependencyTableRow[] = [
   { dependency: "zlib", type: "dependency", action: "updated", from: "1.0.0", to: "2.0.0" },
   { dependency: "axios", type: "dependency", action: "updated", from: "1.0.0", to: "2.0.0" },
   { dependency: "moment", type: "dependency", action: "updated", from: "1.0.0", to: "2.0.0" },
  ];
  const result = sortDependencyRows(rows);
  expect(result.map((r) => r.dependency)).toEqual(["axios", "moment", "zlib"]);
 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/utils/dependency-table.test.ts`
Expected: FAIL — `collapseDependencyRows` and `sortDependencyRows` not exported

- [ ] **Step 3: Implement collapse and sort**

Add to `src/utils/dependency-table.ts`:

```typescript
const ACTION_ORDER: Record<string, number> = { removed: 0, updated: 1, added: 2 };

/**
 * Collapse dependency table rows with the same dependency+type key.
 *
 * Rules:
 * - updated+updated → updated (earliest from, latest to)
 * - added+updated → added (final to)
 * - added+removed → drop (net zero)
 * - updated+removed → removed (original from)
 * - removed+added → updated (original from, new to)
 * - contradictory/duplicate → warn, keep later entry
 *
 * @param rows - Array of DependencyTableRow objects
 * @returns Collapsed array
 */
export function collapseDependencyRows(rows: DependencyTableRow[]): DependencyTableRow[] {
 const groups = new Map<string, DependencyTableRow>();

 for (const row of rows) {
  const key = `${row.dependency}\0${row.type}`;
  const existing = groups.get(key);

  if (!existing) {
   groups.set(key, { ...row });
   continue;
  }

  const merged = collapseTwo(existing, row);
  if (merged === null) {
   groups.delete(key);
  } else {
   groups.set(key, merged);
  }
 }

 return [...groups.values()];
}

/**
 * Collapse two rows into one, or return null to drop.
 */
function collapseTwo(first: DependencyTableRow, second: DependencyTableRow): DependencyTableRow | null {
 const a = first.action;
 const b = second.action;

 if (a === "updated" && b === "updated") {
  return { ...first, to: second.to };
 }
 if (a === "added" && b === "updated") {
  return { ...first, to: second.to };
 }
 if (a === "added" && b === "removed") {
  return null; // net zero
 }
 if (a === "updated" && b === "removed") {
  return { ...first, action: "removed", to: "\u2014" };
 }
 if (a === "removed" && b === "added") {
  return { ...first, action: "updated", from: first.from, to: second.to };
 }

 // Contradictory or duplicate: keep later entry
 return { ...second };
}

/**
 * Sort dependency table rows.
 *
 * Order: removed → updated → added, then type alphabetically,
 * then dependency name alphabetically.
 *
 * @param rows - Array of DependencyTableRow objects
 * @returns New sorted array
 */
export function sortDependencyRows(rows: DependencyTableRow[]): DependencyTableRow[] {
 return [...rows].sort((a, b) => {
  const actionDiff = (ACTION_ORDER[a.action] ?? 99) - (ACTION_ORDER[b.action] ?? 99);
  if (actionDiff !== 0) return actionDiff;

  const typeDiff = a.type.localeCompare(b.type);
  if (typeDiff !== 0) return typeDiff;

  return a.dependency.localeCompare(b.dependency);
 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/utils/dependency-table.test.ts`
Expected: PASS — all collapse and sort tests green

- [ ] **Step 5: Commit**

```bash
git add src/utils/dependency-table.ts src/utils/dependency-table.test.ts
git commit -m "feat: add dependency table collapse and sort logic"
```

---

### Task 4: DependencyTable Class Wrapper & Exports

**Files:**

- Create: `src/api/dependency-table.ts`
- Modify: `src/index.ts` (add exports)
- Modify: `src/__test__/exports.test.ts` (verify new exports)

- [ ] **Step 1: Write the failing test**

Add to `src/__test__/exports.test.ts` inside the `"main entry point"` describe block, a new `it` block:

```typescript
 it("exports dependency table utilities", async () => {
  const mod = await import("../index.js");
  expect(mod.DependencyTable).toBeDefined();
  expect(mod.DependencyTableRowSchema).toBeDefined();
  expect(mod.DependencyTableTypeSchema).toBeDefined();
  expect(mod.DependencyActionSchema).toBeDefined();
  expect(mod.DependencyTableSchema).toBeDefined();
  expect(mod.VersionOrEmptySchema).toBeDefined();
 });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/__test__/exports.test.ts`
Expected: FAIL — `DependencyTable` is not defined

- [ ] **Step 3: Write the class wrapper and add exports**

Create `src/api/dependency-table.ts`:

```typescript
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
```

Add exports to `src/index.ts`. After the existing `ChangelogTransformer` export (line 21), add:

```typescript
export { DependencyTable } from "./api/dependency-table.js";
```

In the schemas section (after `DependencyUpdateSchema` on line 61), add:

```typescript
export type { DependencyAction, DependencyTableRow, DependencyTableType } from "./schemas/dependency-table.js";
export {
 DependencyActionSchema,
 DependencyTableRowSchema,
 DependencyTableSchema,
 DependencyTableTypeSchema,
 VersionOrEmptySchema,
} from "./schemas/dependency-table.js";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/__test__/exports.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/api/dependency-table.ts src/index.ts src/__test__/exports.test.ts
git commit -m "feat: add DependencyTable class wrapper and public exports"
```

---

## Chunk 2: Remark-Lint Rule (Layer 1)

### Task 5: Remark-Lint Rule — dependency-table-format

**Files:**

- Modify: `src/constants.ts` (add CSH005)
- Create: `src/remark/rules/dependency-table-format.ts`
- Test: `src/remark/rules/dependency-table-format.test.ts`

**Context:** Follow the pattern in `src/remark/rules/required-sections.ts` — use `lintRule()` from `unified-lint-rule`, `visit()` from `unist-util-visit`. The rule fires on `## Dependencies` headings, finds the next sibling table, and validates it using `parseDependencyTable()`. Also validates action/from/to consistency (em dash rules).

- [ ] **Step 1: Add CSH005 to constants**

Modify `src/constants.ts` to add the new rule doc entry:

```typescript
export const RULE_DOCS = {
 CSH001: `${DOCS_BASE}/CSH001.md`,
 CSH002: `${DOCS_BASE}/CSH002.md`,
 CSH003: `${DOCS_BASE}/CSH003.md`,
 CSH004: `${DOCS_BASE}/CSH004.md`,
 CSH005: `${DOCS_BASE}/CSH005.md`,
} as const;
```

- [ ] **Step 2: Write the failing test**

Create `src/remark/rules/dependency-table-format.test.ts`:

```typescript
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { describe, expect, it } from "vitest";

import { DependencyTableFormatRule } from "./dependency-table-format.js";

function lint(markdown: string) {
 const file = unified().use(remarkParse).use(remarkGfm).use(DependencyTableFormatRule).processSync(markdown);
 return file.messages.map((m) => m.message);
}

describe("dependency-table-format rule", () => {
 it("accepts a valid dependency table", () => {
  const md = `## Dependencies

| Dependency | Type | Action | From | To |
| --- | --- | --- | --- | --- |
| typescript | devDependency | updated | ^5.4.0 | ^5.6.0 |
| new-pkg | dependency | added | \u2014 | ^1.0.0 |
`;
  expect(lint(md)).toEqual([]);
 });

 it("accepts a table with all types", () => {
  const md = `## Dependencies

| Dependency | Type | Action | From | To |
| --- | --- | --- | --- | --- |
| a | dependency | updated | 1.0.0 | 2.0.0 |
| b | devDependency | updated | 1.0.0 | 2.0.0 |
| c | peerDependency | updated | 1.0.0 | 2.0.0 |
| d | optionalDependency | updated | 1.0.0 | 2.0.0 |
| e | workspace | updated | 1.0.0 | 2.0.0 |
| f | config | updated | 1.0.0 | 2.0.0 |
`;
  expect(lint(md)).toEqual([]);
 });

 it("ignores non-Dependencies sections", () => {
  const md = `## Features

- Added feature X
`;
  expect(lint(md)).toEqual([]);
 });

 it("reports error when Dependencies has a list instead of table", () => {
  const md = `## Dependencies

- foo: 1.0.0 → 2.0.0
`;
  const messages = lint(md);
  expect(messages.length).toBeGreaterThan(0);
  expect(messages[0]).toContain("table");
 });

 it("reports error for wrong column names", () => {
  const md = `## Dependencies

| Package | Kind | Action | From | To |
| --- | --- | --- | --- | --- |
| foo | dependency | updated | 1.0.0 | 2.0.0 |
`;
  const messages = lint(md);
  expect(messages.length).toBeGreaterThan(0);
  expect(messages[0]).toContain("columns");
 });

 it("reports error for invalid type value", () => {
  const md = `## Dependencies

| Dependency | Type | Action | From | To |
| --- | --- | --- | --- | --- |
| foo | devDep | updated | 1.0.0 | 2.0.0 |
`;
  const messages = lint(md);
  expect(messages.length).toBeGreaterThan(0);
  expect(messages[0]).toContain("devDep");
 });

 it("reports error when from is not em dash for added", () => {
  const md = `## Dependencies

| Dependency | Type | Action | From | To |
| --- | --- | --- | --- | --- |
| foo | dependency | added | 1.0.0 | 2.0.0 |
`;
  const messages = lint(md);
  expect(messages.length).toBeGreaterThan(0);
  expect(messages[0]).toContain("added");
 });

 it("reports error when to is not em dash for removed", () => {
  const md = `## Dependencies

| Dependency | Type | Action | From | To |
| --- | --- | --- | --- | --- |
| foo | dependency | removed | 1.0.0 | 2.0.0 |
`;
  const messages = lint(md);
  expect(messages.length).toBeGreaterThan(0);
  expect(messages[0]).toContain("removed");
 });

 it("reports error for empty table (no data rows)", () => {
  const md = `## Dependencies

| Dependency | Type | Action | From | To |
| --- | --- | --- | --- | --- |
`;
  const messages = lint(md);
  expect(messages.length).toBeGreaterThan(0);
 });

 it("includes rule documentation URL", () => {
  const md = `## Dependencies

- bad content
`;
  const file = unified().use(remarkParse).use(remarkGfm).use(DependencyTableFormatRule).processSync(md);
  expect(file.messages[0].message).toContain("CSH005");
 });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run src/remark/rules/dependency-table-format.test.ts`
Expected: FAIL — cannot resolve module

- [ ] **Step 4: Write the implementation**

Create `src/remark/rules/dependency-table-format.ts`:

```typescript
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
    file.message(
     `${error instanceof Error ? error.message : String(error)}. See: ${RULE_DOCS.CSH005}`,
     table,
    );
   }
  });
 },
);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/remark/rules/dependency-table-format.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/constants.ts src/remark/rules/dependency-table-format.ts src/remark/rules/dependency-table-format.test.ts
git commit -m "feat: add dependency-table-format remark-lint rule (CSH005)"
```

---

### Task 6: Register Remark Rule in Presets & Exports

**Files:**

- Modify: `src/remark/presets.ts` (add to SilkChangesetPreset)
- Modify: `src/remark/index.ts` (add export)
- Modify: `src/__test__/exports.test.ts` (update length assertions)

- [ ] **Step 1: Update presets.ts**

Add import at top of `src/remark/presets.ts` (after line 16):

```typescript
import { DependencyTableFormatRule } from "./rules/dependency-table-format.js";
```

Add to `SilkChangesetPreset` array (after `UncategorizedContentRule` on line 39):

```typescript
 DependencyTableFormatRule,
```

- [ ] **Step 2: Update remark/index.ts**

Add after line 22 (after UncategorizedContentRule export):

```typescript
export { DependencyTableFormatRule } from "./rules/dependency-table-format.js";
```

- [ ] **Step 3: Update exports.test.ts**

In the `"remark entry point"` describe block, update the lint rules test to add:

```typescript
  expect(mod.DependencyTableFormatRule).toBeDefined();
```

Update `SilkChangesetPreset` length assertion from `4` to `5` (appears on lines 75, 83).

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/__test__/exports.test.ts`
Expected: PASS with updated lengths (5 for lint preset, 6 for transform preset)

- [ ] **Step 5: Commit**

```bash
git add src/remark/presets.ts src/remark/index.ts src/__test__/exports.test.ts
git commit -m "feat: register dependency-table-format in remark presets and exports"
```

---

## Chunk 3: Transform Plugin (Layer 3)

### Task 7: Aggregate Dependency Tables Plugin

**Files:**

- Create: `src/remark/plugins/aggregate-dependency-tables.ts`
- Test: `src/remark/plugins/aggregate-dependency-tables.test.ts`
- Modify: `src/remark/presets.ts` (insert at index 0 of transform preset)

- [ ] **Step 1: Write the failing test**

Create `src/remark/plugins/aggregate-dependency-tables.test.ts`:

```typescript
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { describe, expect, it } from "vitest";

import { AggregateDependencyTablesPlugin } from "./aggregate-dependency-tables.js";

function transform(md: string): string {
 return unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(AggregateDependencyTablesPlugin)
  .use(remarkStringify)
  .processSync(md)
  .toString();
}

const TABLE_HEADER = `| Dependency | Type | Action | From | To |
| --- | --- | --- | --- | --- |`;

describe("AggregateDependencyTablesPlugin", () => {
 it("passes through a single dependency table unchanged (but sorted)", () => {
  const md = `## 1.0.0

### Dependencies

${TABLE_HEADER}
| zlib | dependency | updated | 1.0.0 | 2.0.0 |
| axios | dependency | updated | 0.1.0 | 0.2.0 |
`;
  const result = transform(md);
  // Should be sorted: axios before zlib
  const axiosIdx = result.indexOf("axios");
  const zlibIdx = result.indexOf("zlib");
  expect(axiosIdx).toBeLessThan(zlibIdx);
 });

 it("merges two dependency tables in one version block", () => {
  const md = `## 1.0.0

### Dependencies

${TABLE_HEADER}
| foo | dependency | updated | 1.0.0 | 2.0.0 |

### Dependencies

${TABLE_HEADER}
| bar | devDependency | updated | 3.0.0 | 4.0.0 |
`;
  const result = transform(md);
  // Should have exactly one ### Dependencies heading
  const headingCount = (result.match(/### Dependencies/g) || []).length;
  expect(headingCount).toBe(1);
  // Both deps should be present
  expect(result).toContain("foo");
  expect(result).toContain("bar");
 });

 it("collapses same package across tables", () => {
  const md = `## 1.0.0

### Dependencies

${TABLE_HEADER}
| foo | dependency | updated | 1.0.0 | 2.0.0 |

### Dependencies

${TABLE_HEADER}
| foo | dependency | updated | 2.0.0 | 3.0.0 |
`;
  const result = transform(md);
  // Should collapse to 1.0.0 → 3.0.0
  expect(result).toContain("1.0.0");
  expect(result).toContain("3.0.0");
  expect(result).not.toContain("2.0.0");
 });

 it("handles independent version blocks separately", () => {
  const md = `## 2.0.0

### Dependencies

${TABLE_HEADER}
| foo | dependency | updated | 1.0.0 | 2.0.0 |

## 1.0.0

### Dependencies

${TABLE_HEADER}
| bar | dependency | updated | 0.1.0 | 0.2.0 |
`;
  const result = transform(md);
  expect(result).toContain("foo");
  expect(result).toContain("bar");
  const headingCount = (result.match(/### Dependencies/g) || []).length;
  expect(headingCount).toBe(2);
 });

 it("preserves legacy bullet lists below the table", () => {
  const md = `## 1.0.0

### Dependencies

${TABLE_HEADER}
| foo | dependency | updated | 1.0.0 | 2.0.0 |

- legacy-pkg: 1.0.0 → 2.0.0
`;
  const result = transform(md);
  expect(result).toContain("foo");
  expect(result).toContain("legacy-pkg");
 });

 it("leaves non-Dependencies sections untouched", () => {
  const md = `## 1.0.0

### Features

- Added feature X

### Dependencies

${TABLE_HEADER}
| foo | dependency | updated | 1.0.0 | 2.0.0 |
`;
  const result = transform(md);
  expect(result).toContain("### Features");
  expect(result).toContain("Added feature X");
 });

 it("drops section when all rows collapse to nothing", () => {
  const md = `## 1.0.0

### Features

- Added feature X

### Dependencies

${TABLE_HEADER}
| foo | dependency | added | \u2014 | 1.0.0 |

### Dependencies

${TABLE_HEADER}
| foo | dependency | removed | 1.0.0 | \u2014 |
`;
  const result = transform(md);
  // Dependencies section should be dropped (net zero)
  expect(result).not.toContain("### Dependencies");
  // Features should remain
  expect(result).toContain("### Features");
 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/remark/plugins/aggregate-dependency-tables.test.ts`
Expected: FAIL — cannot resolve module

- [ ] **Step 3: Write the implementation**

Create `src/remark/plugins/aggregate-dependency-tables.ts`:

```typescript
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

import { getBlockSections, getHeadingText, getVersionBlocks } from "../../utils/version-blocks.js";
import {
 collapseDependencyRows,
 parseDependencyTable,
 serializeDependencyTable,
 sortDependencyRows,
} from "../../utils/dependency-table.js";
import type { DependencyTableRow } from "../../schemas/dependency-table.js";

/**
 * Aggregate all dependency tables within each version block into one.
 */
export const AggregateDependencyTablesPlugin: Plugin<[], Root> = () => {
 return (tree: Root) => {
  const blocks = getVersionBlocks(tree);

  // Process blocks in reverse to avoid index shifts
  for (let b = blocks.length - 1; b >= 0; b--) {
   const sections = getBlockSections(tree, blocks[b]);
   const depSections = sections.filter(
    (s) => getHeadingText(s.heading).toLowerCase() === "dependencies",
   );

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

   // If no rows left after collapse, skip (section drops naturally)
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/remark/plugins/aggregate-dependency-tables.test.ts`
Expected: PASS

- [ ] **Step 5: Register in preset and exports**

In `src/remark/presets.ts`, add import:

```typescript
import { AggregateDependencyTablesPlugin } from "./plugins/aggregate-dependency-tables.js";
```

Insert at index 0 of `SilkChangesetTransformPreset`:

```typescript
export const SilkChangesetTransformPreset = [
 AggregateDependencyTablesPlugin,
 MergeSectionsPlugin,
 // ... rest unchanged
```

Update the JSDoc comment numbering above the array to reflect the new plugin at position 1.

In `src/remark/index.ts`, add export:

```typescript
export { AggregateDependencyTablesPlugin } from "./plugins/aggregate-dependency-tables.js";
```

In `src/__test__/exports.test.ts`:

- Update `SilkChangesetTransformPreset` length from `6` to `7` (lines 76, 88)
- Add `expect(mod.AggregateDependencyTablesPlugin).toBeDefined()` to the transform plugins test

- [ ] **Step 6: Run all tests**

Run: `pnpm vitest run src/__test__/exports.test.ts src/remark/plugins/aggregate-dependency-tables.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/remark/plugins/aggregate-dependency-tables.ts src/remark/plugins/aggregate-dependency-tables.test.ts src/remark/presets.ts src/remark/index.ts src/__test__/exports.test.ts
git commit -m "feat: add aggregate-dependency-tables transform plugin"
```

---

## Chunk 4: Changelog Formatter (Layer 2)

### Task 8: Update getDependencyReleaseLine to Emit Table

**Files:**

- Modify: `src/changelog/getDependencyReleaseLine.ts`
- Modify: `src/changelog/getDependencyReleaseLine.test.ts`

**Context:** The function currently returns a bullet-list string. It needs to emit a markdown table instead. The `ModCompWithPackage` type has `name`, `type` (VersionType — major/minor/patch), `oldVersion`, `newVersion`, and `packageJson`. Dependency type must be inferred from `packageJson` fields.

- [ ] **Step 1: Write updated tests**

Replace the test content in `src/changelog/getDependencyReleaseLine.test.ts`:

```typescript
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import type { ChangesetOptions } from "../schemas/options.js";
import { makeGitHubTest } from "../services/github.js";
import type { GitHubCommitInfo } from "../vendor/github-info.js";
import type { ModCompWithPackage, NewChangesetWithCommit } from "../vendor/types.js";
import { getDependencyReleaseLine } from "./getDependencyReleaseLine.js";

const OPTIONS: ChangesetOptions = { repo: "owner/repo" };

const MOCK_INFO_A: GitHubCommitInfo = {
 user: "alice",
 pull: 10,
 links: {
  commit: "[`abc1234`](https://github.com/owner/repo/commit/abc1234567890)",
  pull: "https://github.com/owner/repo/pull/10",
  user: "https://github.com/alice",
 },
};

const testLayer = makeGitHubTest(
 new Map([["abc1234567890", MOCK_INFO_A]]),
);

function makeDep(
 name: string,
 newVersion: string,
 deps?: Record<string, Record<string, string>>,
): ModCompWithPackage {
 return {
  name,
  type: "patch",
  oldVersion: "1.0.0",
  newVersion,
  changesets: [],
  packageJson: { name, version: newVersion, ...deps },
  dir: `/packages/${name}`,
 };
}

describe("getDependencyReleaseLine", () => {
 it("returns empty string when no dependencies updated", async () => {
  const changesets: NewChangesetWithCommit[] = [
   { id: "cs-1", summary: "bump", releases: [], commit: "abc1234567890" },
  ];
  const result = await Effect.runPromise(
   getDependencyReleaseLine(changesets, [], OPTIONS).pipe(Effect.provide(testLayer)),
  );
  expect(result).toBe("");
 });

 it("emits a markdown table with correct columns", async () => {
  const changesets: NewChangesetWithCommit[] = [
   { id: "cs-1", summary: "bump", releases: [] },
  ];
  const deps = [
   makeDep("typescript", "5.0.0", { devDependencies: { typescript: "^5.0.0" } }),
  ];

  const result = await Effect.runPromise(
   getDependencyReleaseLine(changesets, deps, OPTIONS).pipe(Effect.provide(testLayer)),
  );

  expect(result).toContain("| Dependency |");
  expect(result).toContain("| Type |");
  expect(result).toContain("| Action |");
  expect(result).toContain("| From |");
  expect(result).toContain("| To |");
  expect(result).toContain("typescript");
  expect(result).toContain("devDependency");
  expect(result).toContain("updated");
 });

 it("infers dependency type from packageJson fields", async () => {
  const changesets: NewChangesetWithCommit[] = [
   { id: "cs-1", summary: "bump", releases: [] },
  ];
  const deps = [
   makeDep("foo", "2.0.0", { dependencies: { foo: "^2.0.0" } }),
   makeDep("bar", "3.0.0", { peerDependencies: { bar: "^3.0.0" } }),
  ];

  const result = await Effect.runPromise(
   getDependencyReleaseLine(changesets, deps, OPTIONS).pipe(Effect.provide(testLayer)),
  );

  expect(result).toContain("dependency");
  expect(result).toContain("peerDependency");
 });

 it("infers optionalDependency type", async () => {
  const changesets: NewChangesetWithCommit[] = [
   { id: "cs-1", summary: "bump", releases: [] },
  ];
  const deps = [
   makeDep("opt-pkg", "2.0.0", { optionalDependencies: { "opt-pkg": "^2.0.0" } }),
  ];

  const result = await Effect.runPromise(
   getDependencyReleaseLine(changesets, deps, OPTIONS).pipe(Effect.provide(testLayer)),
  );

  expect(result).toContain("optionalDependency");
 });

 it("falls back to dependency type when not found in any field", async () => {
  const changesets: NewChangesetWithCommit[] = [
   { id: "cs-1", summary: "bump", releases: [] },
  ];
  const deps = [makeDep("unknown-pkg", "2.0.0")];

  const result = await Effect.runPromise(
   getDependencyReleaseLine(changesets, deps, OPTIONS).pipe(Effect.provide(testLayer)),
  );

  expect(result).toContain("dependency");
 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/changelog/getDependencyReleaseLine.test.ts`
Expected: FAIL — output still contains old bullet-list format

- [ ] **Step 3: Rewrite getDependencyReleaseLine**

Replace the content of `src/changelog/getDependencyReleaseLine.ts`:

```typescript
/**
 * Core formatter: getDependencyReleaseLine.
 *
 * Formats dependency update entries as a structured markdown table.
 */

import { Effect } from "effect";

import type { DependencyTableRow, DependencyTableType } from "../schemas/dependency-table.js";
import type { ChangesetOptions } from "../schemas/options.js";
import { GitHubService } from "../services/github.js";
import { serializeDependencyTableToMarkdown } from "../utils/dependency-table.js";
import type { ModCompWithPackage, NewChangesetWithCommit } from "../vendor/types.js";

/** Field-to-type mapping for inferring dependency type from packageJson. */
const FIELD_MAP: readonly [string, DependencyTableType][] = [
 ["dependencies", "dependency"],
 ["devDependencies", "devDependency"],
 ["peerDependencies", "peerDependency"],
 ["optionalDependencies", "optionalDependency"],
] as const;

/**
 * Infer the dependency table type from a package's packageJson.
 */
function inferDependencyType(dep: ModCompWithPackage): DependencyTableType {
 const pkg = dep.packageJson as Record<string, unknown>;
 for (const [field, type] of FIELD_MAP) {
  const section = pkg[field];
  if (typeof section === "object" && section !== null && dep.name in (section as Record<string, unknown>)) {
   return type;
  }
 }
 return "dependency";
}

/**
 * Format dependency release lines as a markdown table.
 *
 * @param _changesets - Changesets that caused dependency updates (unused in table format)
 * @param dependenciesUpdated - Dependencies that were updated
 * @param _options - Validated configuration options (unused in table format)
 * @returns Formatted markdown table string, or empty string if no deps updated
 */
export function getDependencyReleaseLine(
 _changesets: NewChangesetWithCommit[],
 dependenciesUpdated: ModCompWithPackage[],
 _options: ChangesetOptions,
): Effect.Effect<string, never, GitHubService> {
 return Effect.gen(function* () {
  if (dependenciesUpdated.length === 0) return "";

  // TODO: GitHubService is no longer used for commit links in table format.
  // Kept to maintain the existing type signature contract. Consider removing
  // the GitHubService dependency in a future breaking change.
  yield* GitHubService;

  const rows: DependencyTableRow[] = dependenciesUpdated.map((dep) => ({
   dependency: dep.name,
   type: inferDependencyType(dep),
   action: "updated" as const,
   from: dep.oldVersion,
   to: dep.newVersion,
  }));

  return serializeDependencyTableToMarkdown(rows);
 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/changelog/getDependencyReleaseLine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/changelog/getDependencyReleaseLine.ts src/changelog/getDependencyReleaseLine.test.ts
git commit -m "feat: update getDependencyReleaseLine to emit markdown table"
```

---

## Chunk 5: markdownlint Rule & CLI Init

### Task 9: markdownlint Rule — CSH005

**Files:**

- Create: `src/markdownlint/rules/dependency-table-format.ts`
- Modify: `src/markdownlint/index.ts` (register)
- Modify: `src/__test__/exports.test.ts` (update length)

**Context:** Follow the pattern in `src/markdownlint/rules/required-sections.ts`. Uses micromark token API. The markdownlint rule mirrors the remark-lint rule but uses `params.parsers.micromark.tokens` and `onError()`.

**Important:** The micromark GFM table token structure uses `tableHead`, `tableBody`, `tableDelimiterRow`, `tableRow`, and `tableData` token types — NOT the simpler `tableRow`/`tableCell` from MDAST. Before implementing, write a small diagnostic test that dumps `params.parsers.micromark.tokens` for a table to understand the exact token tree. Reference how markdownlint's built-in `MD056` rule traverses table tokens.

The existing markdownlint rules in this project use flat token iteration (`params.parsers.micromark.tokens`) rather than nested children. This rule may need to follow the same flat approach, using `params.lines` for line-based table parsing as an alternative to deep token traversal.

- [ ] **Step 1: Investigate micromark table token structure**

Write a temporary test that dumps token output for a GFM table:

```typescript
import markdownlint from "markdownlint";

const md = `## Dependencies

| Dependency | Type | Action | From | To |
| --- | --- | --- | --- | --- |
| foo | dependency | updated | 1.0.0 | 2.0.0 |
`;

// Create a diagnostic rule that dumps tokens
const dumpRule = {
 names: ["dump-tokens"],
 description: "Dump table tokens for analysis",
 tags: ["debug"],
 parser: "micromark",
 function(params, onError) {
  const tableTokens = params.parsers.micromark.tokens.filter(
   t => t.type.toLowerCase().includes("table")
  );
  console.log(JSON.stringify(tableTokens, null, 2));
 },
};

// Run markdownlint with the diagnostic rule
markdownlint.sync({ strings: { test: md }, customRules: [dumpRule] });
```

Study the output to understand the actual token hierarchy before implementing.

- [ ] **Step 2: Write the implementation based on actual token structure**

Create `src/markdownlint/rules/dependency-table-format.ts` using the token
structure discovered in Step 1. The implementation should:

- Find `atxHeading` tokens with depth 2 and text "Dependencies"
- Look ahead for `table` tokens (or equivalent from micromark-extension-gfm-table)
- Report if no table is found (list or empty section)
- Validate column headers by parsing the header row tokens
- Validate data row cell values (type, action) against allowed sets
- Use `onError({ lineNumber, detail })` for all reports
- Include `RULE_DOCS.CSH005` in all error messages

```typescript
import type { Rule } from "markdownlint";

import { RULE_DOCS, getHeadingLevel, getHeadingText } from "./utils.js";

// Implementation depends on micromark token structure from Step 1.
// Key validation points:
// - Dependencies section must contain a table, not a list
// - Table must have 5 columns: Dependency, Type, Action, From, To
// - Type must be one of the valid DependencyTableType values
// - Action must be one of: added, updated, removed

export const DependencyTableFormatRule: Rule = {
 names: ["changeset-dependency-table-format", "CSH005"],
 description: "Dependencies section must contain a valid dependency table",
 tags: ["changeset"],
 parser: "micromark",
 function: function CSH005(params, onError) {
  // TODO: Implement based on actual micromark token structure
  // discovered in Step 1. The token types for GFM tables may include
  // tableHead, tableBody, tableDelimiterRow, tableRow, tableData
  // rather than the MDAST-style tableRow/tableCell hierarchy.
 },
};
```

- [ ] **Step 2: Register in markdownlint/index.ts**

Add import after line 21:

```typescript
import { DependencyTableFormatRule } from "./rules/dependency-table-format.js";
```

Add to the named export on line 23:

```typescript
export { ContentStructureRule, DependencyTableFormatRule, HeadingHierarchyRule, RequiredSectionsRule, UncategorizedContentRule };
```

Add to the `SilkChangesetsRules` array (after `UncategorizedContentRule`):

```typescript
 DependencyTableFormatRule,
```

- [ ] **Step 3: Update exports test**

In `src/__test__/exports.test.ts`, update markdownlint entry point:

- Change `expect(mod.default).toHaveLength(4)` to `5`
- Add `expect(mod.DependencyTableFormatRule).toBeDefined()`

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/__test__/exports.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/markdownlint/rules/dependency-table-format.ts src/markdownlint/index.ts src/__test__/exports.test.ts
git commit -m "feat: add dependency-table-format markdownlint rule (CSH005)"
```

---

### Task 10: CLI Init Updates

**Files:**

- Modify: `src/cli/commands/init.ts` (add rule to RULE_NAMES)

This is a single-line change. The `RULE_NAMES` constant on line 29-34 drives both `handleBaseMarkdownlint()` and `handleChangesetMarkdownlint()` as well as all check functions. Adding the new rule name there propagates everywhere automatically.

- [ ] **Step 1: Update RULE_NAMES**

Modify `src/cli/commands/init.ts` line 29-34 to add the new rule:

```typescript
const RULE_NAMES = [
 "changeset-heading-hierarchy",
 "changeset-required-sections",
 "changeset-content-structure",
 "changeset-uncategorized-content",
 "changeset-dependency-table-format",
] as const;
```

- [ ] **Step 2: Run existing init tests**

Run: `pnpm vitest run src/cli/commands/init.test.ts`
Expected: PASS (existing tests should still pass; the new rule name gets added alongside the existing four)

- [ ] **Step 3: Commit**

```bash
git add src/cli/commands/init.ts
git commit -m "feat: register CSH005 in CLI init command"
```

---

## Chunk 6: Integration Tests & Final Verification

### Task 11: Pipeline Integration Test

**Files:**

- Modify: `src/__test__/pipeline.test.ts` (add dependency table test)

- [ ] **Step 1: Write pipeline integration test**

Add a new test to `src/__test__/pipeline.test.ts`:

```typescript
it("round-trips dependency table through lint → format → transform", () => {
 const changeset = `## Dependencies

| Dependency | Type | Action | From | To |
| --- | --- | --- | --- | --- |
| typescript | devDependency | updated | ^5.4.0 | ^5.6.0 |
| new-pkg | dependency | added | \u2014 | ^1.0.0 |
`;

 // Layer 1: lint validation
 const lintFile = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(DependencyTableFormatRule)
  .processSync(changeset);
 expect(lintFile.messages).toHaveLength(0);

 // Layer 3: transform (simulate changelog with version heading)
 const changelog = `## 1.0.0\n\n### Dependencies\n\n${changeset.split("\n\n").slice(1).join("\n\n")}`;
 const transformed = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(AggregateDependencyTablesPlugin)
  .use(remarkStringify)
  .processSync(changelog)
  .toString();

 expect(transformed).toContain("typescript");
 expect(transformed).toContain("new-pkg");
 // Should be sorted: added comes after updated
 const tsIdx = transformed.indexOf("typescript");
 const newIdx = transformed.indexOf("new-pkg");
 expect(tsIdx).toBeLessThan(newIdx);
});
```

Add the necessary imports at the top of the file (if not already present):

```typescript
import { DependencyTableFormatRule } from "../remark/rules/dependency-table-format.js";
import { AggregateDependencyTablesPlugin } from "../remark/plugins/aggregate-dependency-tables.js";
import remarkGfm from "remark-gfm";
```

- [ ] **Step 2: Run the test**

Run: `pnpm vitest run src/__test__/pipeline.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/pipeline.test.ts
git commit -m "test: add dependency table pipeline integration test"
```

---

### Task 12: Full Suite Verification

- [ ] **Step 1: Run full test suite**

Run: `pnpm run test`
Expected: All tests pass

- [ ] **Step 2: Run linting**

Run: `pnpm run lint:fix && pnpm run lint:md:fix`
Expected: Clean or only auto-fixable issues

- [ ] **Step 3: Run typecheck**

Run: `pnpm run typecheck`
Expected: No type errors

- [ ] **Step 4: Run build**

Run: `pnpm run build`
Expected: Clean build

- [ ] **Step 5: Final commit (if lint/format changes)**

```bash
git add -A
git commit -m "fix: lint and formatting"
```

---

### Task 13: Update In-Flight Changesets

- [ ] **Step 1: Check for existing dependency changesets**

Run: `ls .changeset/*.md` and check if any contain `## Dependencies` with bullet-list format.

- [ ] **Step 2: Convert to table format**

If any exist, convert them from:

```markdown
## Dependencies

- @savvy-web/commitlint: ^0.3.4 → ^0.4.0
```

To:

```markdown
## Dependencies

| Dependency | Type | Action | From | To |
| --- | --- | --- | --- | --- |
| @savvy-web/commitlint | devDependency | updated | ^0.3.4 | ^0.4.0 |
```

- [ ] **Step 3: Commit converted changesets**

```bash
git add .changeset/
git commit -m "chore: convert in-flight changesets to table format"
```
