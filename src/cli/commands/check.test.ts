import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ChangesetLinter } from "../../api/linter.js";

describe("check command logic", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "cli-check-"));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true });
	});

	it("valid changesets pass check with no errors", () => {
		writeFileSync(join(tempDir, "feat.md"), '---\n"@savvy-web/changesets": minor\n---\n\n## Features\n\n- Added CLI\n');
		writeFileSync(
			join(tempDir, "fix.md"),
			'---\n"@savvy-web/changesets": patch\n---\n\n## Bug Fixes\n\n- Fixed something\n',
		);
		const messages = ChangesetLinter.validate(tempDir);
		expect(messages).toEqual([]);
	});

	it("invalid changesets fail check with errors", () => {
		writeFileSync(join(tempDir, "bad.md"), '---\n"@savvy-web/changesets": minor\n---\n\n# Bad Title\n');
		const messages = ChangesetLinter.validate(tempDir);
		expect(messages.length).toBeGreaterThan(0);
	});

	it("groups messages by file", () => {
		writeFileSync(join(tempDir, "a.md"), "# Bad\n");
		writeFileSync(join(tempDir, "b.md"), "## Unknown\n\n- content\n");
		const messages = ChangesetLinter.validate(tempDir);

		const byFile = new Map<string, typeof messages>();
		for (const msg of messages) {
			const existing = byFile.get(msg.file);
			if (existing) {
				existing.push(msg);
			} else {
				byFile.set(msg.file, [msg]);
			}
		}

		expect(byFile.size).toBe(2);
	});

	it("provides accurate error count in summary", () => {
		writeFileSync(join(tempDir, "a.md"), "# Bad\n");
		writeFileSync(join(tempDir, "b.md"), '---\n"pkg": minor\n---\n\n## Features\n\n- Good\n');
		const messages = ChangesetLinter.validate(tempDir);
		const errorCount = messages.length;
		expect(errorCount).toBeGreaterThan(0);

		const filesWithErrors = new Set(messages.map((m) => m.file)).size;
		expect(filesWithErrors).toBe(1);
	});
});
