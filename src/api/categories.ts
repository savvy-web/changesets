/**
 * Class-based API wrapper for section categories.
 *
 * Provides a static class interface that bridges to the underlying
 * Effect-native category functions for higher-level consumers.
 */

import {
	BREAKING_CHANGES,
	BUG_FIXES,
	BUILD_SYSTEM,
	CATEGORIES,
	CI,
	DEPENDENCIES,
	DOCUMENTATION,
	FEATURES,
	MAINTENANCE,
	OTHER,
	PERFORMANCE,
	REFACTORING,
	REVERTS,
	TESTS,
	allHeadings,
	fromHeading,
	isValidHeading,
	resolveCommitType,
} from "../categories/index.js";
import type { SectionCategory } from "../categories/types.js";

/**
 * Static class wrapper for category operations.
 *
 * Provides methods for resolving conventional commit types to changelog
 * section categories and validating section headings.
 *
 * @example
 * ```typescript
 * import { Categories } from "\@savvy-web/changesets";
 * import type { SectionCategory } from "\@savvy-web/changesets";
 *
 * const cat: SectionCategory = Categories.fromCommitType("feat");
 * console.log(cat.heading); // "Features"
 * console.log(cat.priority); // 2
 *
 * const isValid: boolean = Categories.isValidHeading("Bug Fixes");
 * console.log(isValid); // true
 * ```
 *
 * @see {@link SectionCategory} for the category shape
 *
 * @public
 */
export class Categories {
	private constructor() {}

	/** Breaking changes - backward-incompatible changes (priority 1) */
	static readonly BREAKING_CHANGES: SectionCategory = BREAKING_CHANGES;

	/** Features - new functionality (priority 2) */
	static readonly FEATURES: SectionCategory = FEATURES;

	/** Bug Fixes - bug corrections (priority 3) */
	static readonly BUG_FIXES: SectionCategory = BUG_FIXES;

	/** Performance - performance improvements (priority 4) */
	static readonly PERFORMANCE: SectionCategory = PERFORMANCE;

	/** Documentation - documentation changes (priority 5) */
	static readonly DOCUMENTATION: SectionCategory = DOCUMENTATION;

	/** Refactoring - code restructuring (priority 6) */
	static readonly REFACTORING: SectionCategory = REFACTORING;

	/** Tests - test additions or modifications (priority 7) */
	static readonly TESTS: SectionCategory = TESTS;

	/** Build System - build configuration changes (priority 8) */
	static readonly BUILD_SYSTEM: SectionCategory = BUILD_SYSTEM;

	/** CI - continuous integration changes (priority 9) */
	static readonly CI: SectionCategory = CI;

	/** Dependencies - dependency updates (priority 10) */
	static readonly DEPENDENCIES: SectionCategory = DEPENDENCIES;

	/** Maintenance - general maintenance (priority 11) */
	static readonly MAINTENANCE: SectionCategory = MAINTENANCE;

	/** Reverts - reverted changes (priority 12) */
	static readonly REVERTS: SectionCategory = REVERTS;

	/** Other - uncategorized changes (priority 13) */
	static readonly OTHER: SectionCategory = OTHER;

	/** All categories ordered by priority (ascending). */
	static readonly ALL: readonly SectionCategory[] = CATEGORIES;

	/**
	 * Resolve a conventional commit type to its category.
	 *
	 * @remarks
	 * The breaking flag takes highest precedence, always returning the
	 * "Breaking Changes" category. The special scope `chore(deps)` maps
	 * to "Dependencies" rather than "Maintenance". Unknown types fall
	 * back to "Other".
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
	 * @returns Array of heading strings in priority order
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
