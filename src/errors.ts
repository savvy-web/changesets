/**
 * Tagged errors for \@savvy-web/changesets.
 */

import { Data } from "effect";

/**
 * Base class for ChangesetValidationError.
 *
 * @privateRemarks
 * This export is required for api-extractor documentation generation.
 * Effect's Data.TaggedError creates an anonymous base class that must be
 * explicitly exported to avoid "forgotten export" warnings. Do not delete.
 *
 * @internal
 */
export const ChangesetValidationErrorBase = Data.TaggedError("ChangesetValidationError");

/**
 * Changeset file validation failure.
 *
 * Carries structured issue details with JSON-path and message per issue.
 *
 * @public
 */
export class ChangesetValidationError extends ChangesetValidationErrorBase<{
	/** File path of the changeset that failed validation. */
	readonly file?: string | undefined;
	/** Individual validation issues found. */
	readonly issues: ReadonlyArray<{
		/** JSON-path to the problematic field. */
		readonly path: string;
		/** Human-readable description of the issue. */
		readonly message: string;
	}>;
}> {
	get message() {
		const prefix = this.file ? `${this.file}: ` : "";
		const detail = this.issues.map((i) => `  - ${i.path}: ${i.message}`).join("\n");
		return `${prefix}Changeset validation failed:\n${detail}`;
	}
}

/**
 * Base class for GitHubApiError.
 *
 * @privateRemarks
 * This export is required for api-extractor documentation generation.
 * Effect's Data.TaggedError creates an anonymous base class that must be
 * explicitly exported to avoid "forgotten export" warnings. Do not delete.
 *
 * @internal
 */
export const GitHubApiErrorBase = Data.TaggedError("GitHubApiError");

/**
 * GitHub API request failure.
 *
 * @remarks
 * Use {@link GitHubApiError.isRetryable} to determine whether a retry
 * strategy should be applied. Rate-limited responses (403/429) and
 * server errors (5xx) are considered retryable.
 *
 * @public
 */
export class GitHubApiError extends GitHubApiErrorBase<{
	/** The API operation that failed (e.g., "getInfo"). */
	readonly operation: string;
	/** HTTP status code, if available. */
	readonly statusCode?: number | undefined;
	/** Human-readable failure reason. */
	readonly reason: string;
}> {
	get message() {
		const status = this.statusCode ? ` (${this.statusCode})` : "";
		return `GitHub API error during ${this.operation}${status}: ${this.reason}`;
	}

	/** Whether this error is a rate-limit response (403 or 429). */
	public get isRateLimited(): boolean {
		return this.statusCode === 403 || this.statusCode === 429;
	}

	/** Whether this error is eligible for retry (server errors or rate limits). */
	public get isRetryable(): boolean {
		return this.statusCode !== undefined && (this.statusCode >= 500 || this.isRateLimited);
	}
}

/**
 * Base class for MarkdownParseError.
 *
 * @privateRemarks
 * This export is required for api-extractor documentation generation.
 * Effect's Data.TaggedError creates an anonymous base class that must be
 * explicitly exported to avoid "forgotten export" warnings. Do not delete.
 *
 * @internal
 */
export const MarkdownParseErrorBase = Data.TaggedError("MarkdownParseError");

/**
 * Markdown parsing failure.
 *
 * @public
 */
export class MarkdownParseError extends MarkdownParseErrorBase<{
	/** Source file path, if known. */
	readonly source?: string | undefined;
	/** Human-readable failure reason. */
	readonly reason: string;
	/** Line number where the error occurred (1-based). */
	readonly line?: number | undefined;
	/** Column number where the error occurred (1-based). */
	readonly column?: number | undefined;
}> {
	get message() {
		const loc = this.line ? `:${this.line}${this.column ? `:${this.column}` : ""}` : "";
		const src = this.source ? `${this.source}${loc}: ` : "";
		return `${src}Markdown parse error: ${this.reason}`;
	}
}

/**
 * Base class for ConfigurationError.
 *
 * @privateRemarks
 * This export is required for api-extractor documentation generation.
 * Effect's Data.TaggedError creates an anonymous base class that must be
 * explicitly exported to avoid "forgotten export" warnings. Do not delete.
 *
 * @internal
 */
export const ConfigurationErrorBase = Data.TaggedError("ConfigurationError");

/**
 * Invalid or missing configuration.
 *
 * @see {@link ChangesetOptionsSchema} for the expected configuration shape
 *
 * @public
 */
export class ConfigurationError extends ConfigurationErrorBase<{
	/** Configuration field that is invalid or missing. */
	readonly field: string;
	/** Human-readable failure reason. */
	readonly reason: string;
}> {
	get message() {
		return `Configuration error (${this.field}): ${this.reason}`;
	}
}
