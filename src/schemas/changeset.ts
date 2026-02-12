/**
 * Changeset-related schemas.
 */

import { Schema } from "effect";
import { CommitHashSchema } from "./git.js";
import { NonEmptyString } from "./primitives.js";

/**
 * Schema for a changeset summary (1-1000 characters).
 *
 * @public
 */
export const ChangesetSummarySchema = Schema.String.pipe(
	Schema.minLength(1, { message: () => "Changeset summary cannot be empty" }),
	Schema.maxLength(1000, { message: () => "Changeset summary is too long" }),
);

/**
 * Schema for a changeset object.
 *
 * @public
 */
export const ChangesetSchema = Schema.Struct({
	/** The changeset summary text. */
	summary: ChangesetSummarySchema,
	/** Unique changeset identifier. */
	id: Schema.String,
	/** Git commit hash associated with this changeset. */
	commit: Schema.optional(CommitHashSchema),
});

/**
 * Inferred type for {@link ChangesetSchema}.
 *
 * @public
 */
export interface Changeset extends Schema.Schema.Type<typeof ChangesetSchema> {}

/**
 * Schema for npm dependency types.
 *
 * @public
 */
export const DependencyTypeSchema = Schema.Literal(
	"dependencies",
	"devDependencies",
	"peerDependencies",
	"optionalDependencies",
);

/**
 * Inferred type for {@link DependencyTypeSchema}.
 *
 * @public
 */
export type DependencyType = typeof DependencyTypeSchema.Type;

/**
 * Schema for a dependency update entry.
 *
 * @public
 */
export const DependencyUpdateSchema = Schema.Struct({
	/** Package name (must be non-empty). */
	name: NonEmptyString.annotations({
		message: () => "Package name cannot be empty",
	}),
	/** npm dependency type. */
	type: DependencyTypeSchema,
	/** Previous version string. */
	oldVersion: Schema.String,
	/** New version string. */
	newVersion: Schema.String,
});

/**
 * Inferred type for {@link DependencyUpdateSchema}.
 *
 * @public
 */
export interface DependencyUpdate extends Schema.Schema.Type<typeof DependencyUpdateSchema> {}
