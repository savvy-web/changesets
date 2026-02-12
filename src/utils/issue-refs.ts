/**
 * GitHub issue reference parsing from commit messages.
 *
 * @packageDocumentation
 */

/** Matches "closes #123" or "close: #456, #789" patterns (case-insensitive) */
const CLOSES_ISSUE_PATTERN = /closes?:?\s*#?(\d+(?:\s*,\s*#?\d+)*)/i;

/** Matches "fixes #123" or "fix: #456, #789" patterns (case-insensitive) */
const FIXES_ISSUE_PATTERN = /fix(?:es)?:?\s*#?(\d+(?:\s*,\s*#?\d+)*)/i;

/** Matches "refs #123" or "ref: #456, #789" patterns (case-insensitive) */
const REFS_ISSUE_PATTERN = /refs?:?\s*#?(\d+(?:\s*,\s*#?\d+)*)/i;

/** Pattern for splitting comma-separated issue numbers */
const ISSUE_NUMBER_SPLIT_PATTERN = /\s*,\s*/;

/**
 * Categorized issue references extracted from a commit message.
 */
export interface IssueReferences {
	/** Issue numbers closed by this commit */
	closes: string[];
	/** Issue numbers for bugs fixed by this commit */
	fixes: string[];
	/** Issue numbers referenced but not closed */
	refs: string[];
}

/**
 * Parse a commit message for GitHub issue references.
 *
 * Recognizes `Closes`, `Fixes`, and `Refs` keywords with various formats:
 * - `Closes #123`
 * - `Fixes: #456, #789`
 * - `Refs #101`
 *
 * @param commitMessage - The commit message body to parse
 * @returns Categorized issue references
 */
export function parseIssueReferences(commitMessage: string): IssueReferences {
	const references: IssueReferences = {
		closes: [],
		fixes: [],
		refs: [],
	};

	const closesMatch = CLOSES_ISSUE_PATTERN.exec(commitMessage);
	if (closesMatch) {
		references.closes = closesMatch[1].split(ISSUE_NUMBER_SPLIT_PATTERN).map((num) => num.replace("#", "").trim());
	}

	const fixesMatch = FIXES_ISSUE_PATTERN.exec(commitMessage);
	if (fixesMatch) {
		references.fixes = fixesMatch[1].split(ISSUE_NUMBER_SPLIT_PATTERN).map((num) => num.replace("#", "").trim());
	}

	const refsMatch = REFS_ISSUE_PATTERN.exec(commitMessage);
	if (refsMatch?.[1]) {
		references.refs = refsMatch[1].split(ISSUE_NUMBER_SPLIT_PATTERN).map((num) => num.replace("#", "").trim());
	}

	return references;
}
