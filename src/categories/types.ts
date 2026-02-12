/**
 * Section category type definitions.
 *
 * @packageDocumentation
 */

/**
 * A section category defines how changes are grouped in release notes.
 * Used across all three processing layers.
 */
export interface SectionCategory {
	/** Display heading used in CHANGELOG output */
	readonly heading: string;
	/** Priority for ordering (lower = higher priority) */
	readonly priority: number;
	/** Conventional commit types that map to this category */
	readonly commitTypes: readonly string[];
	/** Brief description for documentation */
	readonly description: string;
}
