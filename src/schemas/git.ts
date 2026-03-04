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
		message: () =>
			'Commit hash must be 7 or more lowercase hexadecimal characters (0-9, a-f). Example: "a1b2c3d" or a full 40-character SHA like "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2". Uppercase letters are not allowed',
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
