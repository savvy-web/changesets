/**
 * Section category schema and type definitions.
 */

import { Schema } from "effect";

/**
 * Schema for a section category that defines how changes are grouped in release notes.
 * Used across all three processing layers.
 *
 * Provides runtime validation and type inference via Effect Schema.
 *
 * @public
 */
export const SectionCategorySchema = Schema.Struct({
	/** Display heading used in CHANGELOG output. */
	heading: Schema.String,
	/** Priority for ordering (lower = higher priority). */
	priority: Schema.Number,
	/** Conventional commit types that map to this category. */
	commitTypes: Schema.Array(Schema.String),
	/** Brief description for documentation. */
	description: Schema.String,
});

/**
 * A section category defines how changes are grouped in release notes.
 * Used across all three processing layers.
 *
 * Inferred from {@link SectionCategorySchema}.
 *
 * @public
 */
export interface SectionCategory extends Schema.Schema.Type<typeof SectionCategorySchema> {}
