/**
 * Changeset configuration option schemas.
 *
 * @packageDocumentation
 */

import { Effect, Schema } from "effect";

import { ConfigurationError } from "../errors.js";

/**
 * Schema for a GitHub repository in `owner/repo` format.
 */
export const RepoSchema = Schema.String.pipe(
	Schema.pattern(/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/, {
		message: () => 'Repository must be in format "owner/repository" (e.g., "microsoft/vscode")',
	}),
);

/**
 * Schema for changeset configuration options.
 */
export const ChangesetOptionsSchema = Schema.Struct({
	repo: RepoSchema,
	commitLinks: Schema.optional(Schema.Boolean),
	prLinks: Schema.optional(Schema.Boolean),
	issueLinks: Schema.optional(Schema.Boolean),
	issuePrefixes: Schema.optional(Schema.Array(Schema.String)),
});

/**
 * Inferred type for {@link ChangesetOptionsSchema}.
 */
export interface ChangesetOptions extends Schema.Schema.Type<typeof ChangesetOptionsSchema> {}

/**
 * Validate changeset options with Effect-idiomatic error handling.
 *
 * Preserves prior art error messages from \@savvy-web/changelog.
 *
 * @param input - Raw configuration input
 * @returns Decoded options or a {@link ConfigurationError}
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

	if (typeof obj.repo === "string" && !/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(obj.repo)) {
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
