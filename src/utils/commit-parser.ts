/**
 * Conventional commit message parsing.
 *
 * @packageDocumentation
 */

/** Matches conventional commit format: `type(scope)!: description` */
const CONVENTIONAL_COMMIT_PATTERN = /^(\w+)(?:\(([^)]+)\))?(!)?\s*:\s*(.+)/;

/**
 * Structured result of parsing a conventional commit message.
 */
export interface ParsedCommitMessage {
	/** Commit type (e.g., "feat", "fix", "docs") */
	type?: string;
	/** Commit scope (e.g., "api", "ui") */
	scope?: string;
	/** Whether the commit has a `!` breaking-change indicator */
	breaking?: boolean;
	/** The commit description (first-line text after the colon) */
	description: string;
	/** The commit body (everything after the first line, trimmed) */
	body?: string;
}

/**
 * Parse a commit message following the Conventional Commits specification.
 *
 * Supports the full format: `type(scope)!: description\n\nbody`
 *
 * @param message - The commit message to parse
 * @returns Parsed components
 */
export function parseCommitMessage(message: string): ParsedCommitMessage {
	const match = CONVENTIONAL_COMMIT_PATTERN.exec(message);

	if (match) {
		const [, type, scope, bang, description] = match;
		const lines = message.split("\n");
		const body = lines.slice(1).join("\n").trim();

		const result: ParsedCommitMessage = {
			type,
			description: description.trim(),
		};
		if (scope) result.scope = scope;
		if (bang === "!") result.breaking = true;
		if (body) result.body = body;
		return result;
	}

	return { description: message };
}
