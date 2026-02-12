/**
 * Class-based API wrapper for section categories.
 *
 * Provides a static class interface that bridges to the underlying
 * Effect-native category functions for higher-level consumers.
 *
 * @packageDocumentation
 */

import { CATEGORIES, allHeadings, fromHeading, isValidHeading, resolveCommitType } from "../categories/index.js";
import type { SectionCategory } from "../categories/types.js";

/**
 * Static class wrapper for category operations.
 *
 * @example
 * ```ts
 * import { Categories } from "@savvy-web/changesets";
 *
 * const cat = Categories.fromCommitType("feat");
 * // => { heading: "Features", priority: 2, ... }
 *
 * const all = Categories.ordered();
 * // => [BREAKING_CHANGES, FEATURES, BUG_FIXES, ...]
 * ```
 */
export class Categories {
	private constructor() {}

	/**
	 * Get all categories ordered by priority (ascending).
	 *
	 * @returns Readonly array of all 13 section categories
	 */
	static ordered(): readonly SectionCategory[] {
		return CATEGORIES;
	}

	/**
	 * Resolve a conventional commit type to its category.
	 *
	 * @param type - The commit type (e.g., "feat", "fix", "chore")
	 * @param scope - Optional scope (e.g., "deps" in `chore(deps):`)
	 * @param breaking - Whether the commit has a `!` suffix
	 * @returns The resolved section category
	 */
	static fromCommitType(type: string, scope?: string, breaking?: boolean): SectionCategory {
		return resolveCommitType(type, scope, breaking);
	}

	/**
	 * Look up a category by its section heading text.
	 * Comparison is case-insensitive.
	 *
	 * @param heading - The heading text (e.g., "Features", "Bug Fixes")
	 * @returns The matching category, or `undefined` if not recognized
	 */
	static fromHeading(heading: string): SectionCategory | undefined {
		return fromHeading(heading);
	}

	/**
	 * Get all valid section heading strings.
	 *
	 * @returns Array of heading strings
	 */
	static allHeadings(): readonly string[] {
		return allHeadings();
	}

	/**
	 * Check whether a heading string matches a known category.
	 * Comparison is case-insensitive.
	 *
	 * @param heading - The heading text to check
	 * @returns `true` if the heading matches a known category
	 */
	static isValidHeading(heading: string): boolean {
		return isValidHeading(heading);
	}
}
