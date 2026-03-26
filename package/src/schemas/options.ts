/**
 * Changeset configuration option schemas and validation.
 *
 * @remarks
 * Defines the schema for the options object passed to the
 * \@savvy-web/changesets changelog formatter in `.changeset/config.json`.
 * The options are specified as the second element of the changelog array:
 *
 * ```json
 * {
 *   "changelog": ["@savvy-web/changesets/changelog", { "repo": "owner/repo" }]
 * }
 * ```
 *
 * @see {@link https://github.com/changesets/changesets/blob/main/docs/config-file-options.md | Changesets config docs}
 * @see {@link https://effect.website/docs/schema/introduction | Effect Schema documentation}
 *
 * @packageDocumentation
 */

import { Effect, Schema } from "effect";

import { ConfigurationError } from "../errors.js";
import { VersionFilesSchema } from "./version-files.js";

/** Regex for `owner/repo` format, shared between schema and validation. */
const REPO_PATTERN = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;

/**
 * Schema for a GitHub repository in `owner/repo` format.
 *
 * @remarks
 * Validates that the string matches the `owner/repository` format used
 * by GitHub. Both the owner and repository segments accept alphanumeric
 * characters, dots, underscores, and hyphens.
 *
 * @example
 * ```typescript
 * import { Schema } from "effect";
 * import { RepoSchema } from "@savvy-web/changesets";
 *
 * // Succeeds
 * Schema.decodeUnknownSync(RepoSchema)("microsoft/vscode");
 *
 * // Throws ParseError — missing slash
 * Schema.decodeUnknownSync(RepoSchema)("vscode");
 * ```
 *
 * @see {@link ChangesetOptionsSchema} which uses this for the `repo` field
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
 * @remarks
 * The `repo` field is required; all other fields are optional with sensible
 * defaults applied by the changelog formatter at runtime. The `versionFiles`
 * option allows specifying additional JSON files (beyond `package.json`)
 * whose version fields should be updated during `changeset version`.
 *
 * @example
 * ```typescript
 * import { Schema } from "effect";
 * import { ChangesetOptionsSchema } from "@savvy-web/changesets";
 * import type { ChangesetOptions } from "@savvy-web/changesets";
 *
 * const options: ChangesetOptions = Schema.decodeUnknownSync(ChangesetOptionsSchema)({
 * 	repo: "savvy-web/changesets",
 * 	commitLinks: true,
 * 	prLinks: true,
 * 	issueLinks: true,
 * 	issuePrefixes: ["#", "GH-"],
 * 	versionFiles: [
 * 		{ glob: "manifest.json", paths: ["$.version"] },
 * 	],
 * });
 * ```
 *
 * @see {@link ChangesetOptions} for the inferred TypeScript type
 * @see {@link validateChangesetOptions} for Effect-idiomatic validation with detailed error messages
 * @see {@link VersionFilesSchema} for the `versionFiles` entry format
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
 * @remarks
 * The `repo` field is always present; all other fields are optional.
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
 * This layered approach ensures that the most common misconfiguration
 * (missing `repo`) produces a clear, actionable message rather than a
 * generic schema parse error.
 *
 * @example
 * ```typescript
 * import { Effect } from "effect";
 * import { validateChangesetOptions, ConfigurationError } from "@savvy-web/changesets";
 *
 * const program = validateChangesetOptions({ repo: "savvy-web/changesets" }).pipe(
 * 	Effect.catchTag("ConfigurationError", (err) =>
 * 		Effect.logError(`Config invalid: ${err.message}`)
 * 	),
 * );
 *
 * Effect.runPromise(program);
 * ```
 *
 * @param input - Raw configuration input (typically from `.changeset/config.json`)
 * @returns An Effect that succeeds with decoded {@link ChangesetOptions} or fails with a {@link ConfigurationError}
 *
 * @see {@link ChangesetOptionsSchema} for the expected configuration shape
 * @see {@link ConfigurationError} for the error type produced on validation failure
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
