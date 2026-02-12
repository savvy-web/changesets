/**
 * Git-related schemas.
 */

import { Schema } from "effect";

/**
 * Schema for a git commit hash (at least 7 lowercase hex characters).
 *
 * @public
 */
export const CommitHashSchema = Schema.String.pipe(
	Schema.pattern(/^[a-f0-9]{7,}$/, {
		message: () => "Commit hash must be at least 7 hexadecimal characters",
	}),
);

/**
 * Semantic version bump type.
 *
 * @public
 */
export const VersionTypeSchema = Schema.Literal("major", "minor", "patch", "none");

/**
 * Inferred type for {@link VersionTypeSchema}.
 *
 * @public
 */
export type VersionType = typeof VersionTypeSchema.Type;
