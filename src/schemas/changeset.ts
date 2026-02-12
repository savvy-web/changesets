/**
 * Changeset-related schemas.
 *
 * @packageDocumentation
 */

import { Schema } from "effect";
import { CommitHashSchema } from "./git.js";
import { NonEmptyString } from "./primitives.js";

/**
 * Schema for a changeset summary (1–1000 characters).
 */
export const ChangesetSummarySchema = Schema.String.pipe(
	Schema.minLength(1, { message: () => "Changeset summary cannot be empty" }),
	Schema.maxLength(1000, { message: () => "Changeset summary is too long" }),
);

/**
 * Schema for a changeset object.
 */
export const ChangesetSchema = Schema.Struct({
	summary: ChangesetSummarySchema,
	id: Schema.String,
	commit: Schema.optional(CommitHashSchema),
});

/**
 * Inferred type for {@link ChangesetSchema}.
 */
export interface Changeset extends Schema.Schema.Type<typeof ChangesetSchema> {}

/**
 * Schema for npm dependency types.
 */
export const DependencyTypeSchema = Schema.Literal(
	"dependencies",
	"devDependencies",
	"peerDependencies",
	"optionalDependencies",
);

/**
 * Inferred type for {@link DependencyTypeSchema}.
 */
export type DependencyType = typeof DependencyTypeSchema.Type;

/**
 * Schema for a dependency update entry.
 */
export const DependencyUpdateSchema = Schema.Struct({
	name: NonEmptyString.annotations({
		message: () => "Package name cannot be empty",
	}),
	type: DependencyTypeSchema,
	oldVersion: Schema.String,
	newVersion: Schema.String,
});

/**
 * Inferred type for {@link DependencyUpdateSchema}.
 */
export interface DependencyUpdate extends Schema.Schema.Type<typeof DependencyUpdateSchema> {}
