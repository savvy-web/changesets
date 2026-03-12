/**
 * Effect schemas for structured dependency table entries.
 *
 * These schemas define the canonical representation for dependency
 * changes tracked as markdown tables in changeset files and CHANGELOGs.
 */

import { Schema } from "effect";
import { NonEmptyString } from "./primitives.js";

/**
 * Valid dependency table actions.
 *
 * @public
 */
export const DependencyActionSchema = Schema.Literal("added", "updated", "removed");

/**
 * Inferred type for {@link DependencyActionSchema}.
 *
 * @public
 */
export type DependencyAction = typeof DependencyActionSchema.Type;

/**
 * Extended dependency types for table format.
 *
 * Unlike {@link DependencyTypeSchema} (which uses plural npm field names),
 * this uses singular forms and adds `workspace` and `config` types.
 *
 * @public
 */
export const DependencyTableTypeSchema = Schema.Literal(
	"dependency",
	"devDependency",
	"peerDependency",
	"optionalDependency",
	"workspace",
	"config",
);

/**
 * Inferred type for {@link DependencyTableTypeSchema}.
 *
 * @public
 */
export type DependencyTableType = typeof DependencyTableTypeSchema.Type;

/**
 * Version string or em dash (U+2014) sentinel for added/removed entries.
 *
 * @public
 */
export const VersionOrEmptySchema = Schema.String.pipe(Schema.pattern(/^(\u2014|[~^]?\d+\.\d+\.\d+[\w.+-]*)$/));

/**
 * Schema for a single dependency table row.
 *
 * @public
 */
export const DependencyTableRowSchema = Schema.Struct({
	/** Package or toolchain name. */
	dependency: NonEmptyString,
	/** Dependency type. */
	type: DependencyTableTypeSchema,
	/** Change action. */
	action: DependencyActionSchema,
	/** Previous version (em dash for added). */
	from: VersionOrEmptySchema,
	/** New version (em dash for removed). */
	to: VersionOrEmptySchema,
});

/**
 * Inferred type for {@link DependencyTableRowSchema}.
 *
 * @public
 */
export interface DependencyTableRow extends Schema.Schema.Type<typeof DependencyTableRowSchema> {}

/**
 * Schema for a dependency table (non-empty array of rows).
 *
 * @public
 */
export const DependencyTableSchema = Schema.Array(DependencyTableRowSchema).pipe(Schema.minItems(1));
