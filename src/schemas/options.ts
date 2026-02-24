/**
 * Changeset configuration option schemas.
 */

import { Effect, Schema } from "effect";

import { ConfigurationError } from "../errors.js";
import { VersionFilesSchema } from "./version-files.js";

/** Regex for `owner/repo` format, shared between schema and validation. */
const REPO_PATTERN = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;

/**
 * Schema for a GitHub repository in `owner/repo` format.
 *
 * @public
 */
export const RepoSchema = Schema.String.pipe(
	Schema.pattern(REPO_PATTERN, {
		message: () => 'Repository must be in format "owner/repository" (e.g., "microsoft/vscode")',
	}),
);

/**
 * Schema for changeset configuration options.
 *
 * @public
 */
export const ChangesetOptionsSchema = Schema.Struct({
	/** GitHub repository in `owner/repo` format. */
	repo: RepoSchema,
	/** Whether to include commit hash links in output. */
	commitLinks: Schema.optional(Schema.Boolean),
	/** Whether to include pull request links in output. */
	prLinks: Schema.optional(Schema.Boolean),
	/** Whether to include issue reference links in output. */
	issueLinks: Schema.optional(Schema.Boolean),
	/** Custom issue reference prefixes (e.g., `["#", "GH-"]`). */
	issuePrefixes: Schema.optional(Schema.Array(Schema.String)),
	/** Additional JSON files to update with version numbers. */
	versionFiles: Schema.optional(VersionFilesSchema),
});

/**
 * Inferred type for {@link ChangesetOptionsSchema}.
 *
 * @public
 */
export interface ChangesetOptions extends Schema.Schema.Type<typeof ChangesetOptionsSchema> {}

/**
 * Validate changeset options with Effect-idiomatic error handling.
 *
 * @remarks
 * Provides detailed, user-friendly error messages that match the prior art
 * from \@savvy-web/changelog. Performs manual pre-validation for `null`,
 * non-object, and missing `repo` before delegating to schema decoding.
 *
 * @param input - Raw configuration input
 * @returns Decoded options or a {@link ConfigurationError}
 *
 * @public
 */
export function validateChangesetOptions(input: unknown): Effect.Effect<ChangesetOptions, ConfigurationError> {
	if (input === null || input === undefined) {
		return Effect.fail(
			new ConfigurationError({
				field: "options",
				reason:
					"Configuration is required. Add options to your changesets config:\n" +
					'"changelog": ["@savvy-web/changesets", { "repo": "owner/repository" }]',
			}),
		);
	}

	if (typeof input !== "object") {
		return Effect.fail(
			new ConfigurationError({
				field: "options",
				reason: "Configuration must be an object",
			}),
		);
	}

	const obj = input as Record<string, unknown>;

	if (!("repo" in obj) || obj.repo === undefined) {
		return Effect.fail(
			new ConfigurationError({
				field: "repo",
				reason:
					'Repository name is required. Add the "repo" option to your changesets config:\n' +
					'"changelog": ["@savvy-web/changesets", { "repo": "owner/repository" }]',
			}),
		);
	}

	if (typeof obj.repo === "string" && !REPO_PATTERN.test(obj.repo)) {
		return Effect.fail(
			new ConfigurationError({
				field: "repo",
				reason:
					`Invalid repository format: "${obj.repo}". ` +
					'Expected format is "owner/repository" (e.g., "microsoft/vscode")',
			}),
		);
	}

	return Schema.decodeUnknown(ChangesetOptionsSchema)(input).pipe(
		Effect.mapError(
			(parseError) =>
				new ConfigurationError({
					field: "options",
					reason: String(parseError),
				}),
		),
	);
}
