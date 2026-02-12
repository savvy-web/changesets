/**
 * Class-based API wrapper for changeset linting.
 *
 * Provides a static class interface that runs all remark-lint rules
 * against changeset markdown files.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";

import contentStructure from "../remark-lint/content-structure.js";
import headingHierarchy from "../remark-lint/heading-hierarchy.js";
import requiredSections from "../remark-lint/required-sections.js";
import { stripFrontmatter } from "../utils/strip-frontmatter.js";

/**
 * A single lint message from validation.
 *
 * @public
 */
export interface LintMessage {
	/** File path that was validated. */
	file: string;
	/** Rule name that produced the message. */
	rule: string;
	/** Line number (1-based). */
	line: number;
	/** Column number (1-based). */
	column: number;
	/** Human-readable message. */
	message: string;
}

/**
 * Static class for linting changeset files.
 *
 * Runs the three remark-lint rules (heading-hierarchy, required-sections,
 * content-structure) against changeset markdown and returns structured
 * diagnostic messages.
 *
 * @example
 * ```typescript
 * import { ChangesetLinter } from "\@savvy-web/changesets";
 * import type { LintMessage } from "\@savvy-web/changesets";
 *
 * const messages: LintMessage[] = ChangesetLinter.validateFile("path/to/changeset.md");
 * for (const msg of messages) {
 *   console.log(`${msg.file}:${msg.line}:${msg.column} ${msg.rule} ${msg.message}`);
 * }
 * ```
 *
 * @public
 */
export class ChangesetLinter {
	private constructor() {}

	/**
	 * Validate a single changeset file.
	 *
	 * Reads the file, strips YAML frontmatter, and runs all lint rules.
	 *
	 * @param filePath - Path to the changeset `.md` file
	 * @returns Array of lint messages (empty if valid)
	 */
	static validateFile(filePath: string): LintMessage[] {
		const raw = readFileSync(filePath, "utf-8");
		return ChangesetLinter.validateContent(raw, filePath);
	}

	/**
	 * Validate a markdown string directly.
	 *
	 * Strips YAML frontmatter and runs all lint rules.
	 *
	 * @param content - Raw markdown content (may include frontmatter)
	 * @param filePath - File path for error reporting (defaults to `"<input>"`)
	 * @returns Array of lint messages (empty if valid)
	 */
	static validateContent(content: string, filePath = "<input>"): LintMessage[] {
		const body = stripFrontmatter(content);

		const processor = unified()
			.use(remarkParse)
			.use(remarkStringify)
			.use(headingHierarchy)
			.use(requiredSections)
			.use(contentStructure);

		const file = processor.processSync(body);

		return file.messages.map((msg) => ({
			file: filePath,
			rule: msg.ruleId ?? msg.source ?? "unknown",
			line: msg.line ?? 1,
			column: msg.column ?? 1,
			message: msg.message,
		}));
	}

	/**
	 * Validate all changeset `.md` files in a directory.
	 *
	 * Scans for `*.md` files (excluding `README.md`) and runs
	 * {@link ChangesetLinter.validateFile} on each.
	 *
	 * @param dir - Directory path to scan
	 * @returns Aggregated lint messages from all files
	 */
	static validate(dir: string): LintMessage[] {
		const entries = readdirSync(dir);
		const mdFiles = entries.filter((f) => f.endsWith(".md") && f !== "README.md");
		const results: LintMessage[] = [];

		for (const filename of mdFiles) {
			const filePath = join(dir, filename);
			results.push(...ChangesetLinter.validateFile(filePath));
		}

		return results;
	}
}
