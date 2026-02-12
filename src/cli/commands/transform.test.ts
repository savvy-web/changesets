import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ChangelogTransformer } from "../../api/transformer.js";

describe("transform command logic", () => {
	it("produces cleaned output from messy input", () => {
		const input = [
			"## 1.0.0",
			"",
			"### Bug Fixes",
			"",
			"- Fix A",
			"",
			"### Features",
			"",
			"- Feat A",
			"",
			"### Bug Fixes",
			"",
			"- Fix B",
			"",
		].join("\n");

		const result = ChangelogTransformer.transformContent(input);

		// Duplicate Bug Fixes should be merged
		const bugFixCount = (result.match(/### Bug Fixes/g) || []).length;
		expect(bugFixCount).toBe(1);

		// Features should be reordered before Bug Fixes
		expect(result.indexOf("### Features")).toBeLessThan(result.indexOf("### Bug Fixes"));
	});

	it("passes through already-clean content unchanged in structure", () => {
		const input = "## 1.0.0\n\n### Features\n\n- Added X\n";
		const result = ChangelogTransformer.transformContent(input);
		expect(result).toContain("### Features");
		expect(result).toContain("Added X");
	});

	it("handles empty content", () => {
		const result = ChangelogTransformer.transformContent("");
		expect(result.trim()).toBe("");
	});
});

describe("transform file operations", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "cli-transform-"));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true });
	});

	it("transforms a file in-place", () => {
		const filePath = join(tempDir, "CHANGELOG.md");
		const input = "## 1.0.0\n\n### Bug Fixes\n\n- Fix A\n\n### Features\n\n- Feat A\n";
		writeFileSync(filePath, input);

		ChangelogTransformer.transformFile(filePath);

		const result = readFileSync(filePath, "utf-8");
		expect(result.indexOf("### Features")).toBeLessThan(result.indexOf("### Bug Fixes"));
	});

	it("reading a missing file throws", () => {
		const filePath = join(tempDir, "nonexistent.md");
		expect(() => readFileSync(filePath, "utf-8")).toThrow();
	});
});
