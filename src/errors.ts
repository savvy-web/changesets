/**
 * Tagged errors for \@savvy-web/changesets.
 *
 * @packageDocumentation
 */

import { Schema } from "effect";

/**
 * Changeset file validation failure.
 *
 * Carries structured issue details with JSON-path and message per issue.
 */
export class ChangesetValidationError extends Schema.TaggedError<ChangesetValidationError>()(
	"ChangesetValidationError",
	{
		file: Schema.optional(Schema.String),
		issues: Schema.Array(
			Schema.Struct({
				path: Schema.String,
				message: Schema.String,
			}),
		),
	},
) {
	get message() {
		const prefix = this.file ? `${this.file}: ` : "";
		const detail = this.issues.map((i) => `  - ${i.path}: ${i.message}`).join("\n");
		return `${prefix}Changeset validation failed:\n${detail}`;
	}
}

/**
 * GitHub API request failure.
 */
export class GitHubApiError extends Schema.TaggedError<GitHubApiError>()("GitHubApiError", {
	operation: Schema.String,
	statusCode: Schema.optional(Schema.Number),
	reason: Schema.String,
}) {
	get message() {
		const status = this.statusCode ? ` (${this.statusCode})` : "";
		return `GitHub API error during ${this.operation}${status}: ${this.reason}`;
	}

	get isRateLimited(): boolean {
		return this.statusCode === 403 || this.statusCode === 429;
	}

	get isRetryable(): boolean {
		return this.statusCode !== undefined && (this.statusCode >= 500 || this.isRateLimited);
	}
}

/**
 * Markdown parsing failure.
 */
export class MarkdownParseError extends Schema.TaggedError<MarkdownParseError>()("MarkdownParseError", {
	source: Schema.optional(Schema.String),
	reason: Schema.String,
	line: Schema.optional(Schema.Number),
	column: Schema.optional(Schema.Number),
}) {
	get message() {
		const loc = this.line ? `:${this.line}${this.column ? `:${this.column}` : ""}` : "";
		const src = this.source ? `${this.source}${loc}: ` : "";
		return `${src}Markdown parse error: ${this.reason}`;
	}
}

/**
 * Invalid or missing configuration.
 */
export class ConfigurationError extends Schema.TaggedError<ConfigurationError>()("ConfigurationError", {
	field: Schema.String,
	reason: Schema.String,
}) {
	get message() {
		return `Configuration error (${this.field}): ${this.reason}`;
	}
}
