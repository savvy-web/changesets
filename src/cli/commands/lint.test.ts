import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ChangesetLinter } from "../../api/linter.js";

describe("lint command logic", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "cli-lint-"));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true });
	});

	it("returns no errors for a valid changeset directory", () => {
		writeFileSync(join(tempDir, "good.md"), '---\n"@savvy-web/changesets": minor\n---\n\n## Features\n\n- Added CLI\n');
		const messages = ChangesetLinter.validate(tempDir);
		expect(messages).toEqual([]);
	});

	it("produces lint messages for invalid content", () => {
		writeFileSync(join(tempDir, "bad.md"), '---\n"@savvy-web/changesets": minor\n---\n\n# Bad Title\n');
		const messages = ChangesetLinter.validate(tempDir);
		expect(messages.length).toBeGreaterThan(0);
		expect(messages[0].file).toContain("bad.md");
	});

	it("returns no errors for an empty directory", () => {
		const messages = ChangesetLinter.validate(tempDir);
		expect(messages).toEqual([]);
	});

	it("formats messages as file:line:col rule message", () => {
		writeFileSync(join(tempDir, "invalid.md"), "# Title\n");
		const messages = ChangesetLinter.validate(tempDir);
		expect(messages.length).toBeGreaterThan(0);

		for (const msg of messages) {
			const formatted = `${msg.file}:${msg.line}:${msg.column} ${msg.rule} ${msg.message}`;
			expect(formatted).toMatch(/^.+:\d+:\d+ \S+ .+$/);
		}
	});
});
