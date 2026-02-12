/**
 * Section category definitions and mapping.
 *
 * Defines the 13 section categories used across all three processing layers.
 * Categories map conventional commit types to CHANGELOG section headings
 * with a priority ordering for display.
 *
 * @packageDocumentation
 */

export type { SectionCategory } from "./types.js";

import type { SectionCategory } from "./types.js";

/** Breaking changes - backward-incompatible changes (priority 1) */
export const BREAKING_CHANGES: SectionCategory = {
	heading: "Breaking Changes",
	priority: 1,
	commitTypes: [],
	description: "Backward-incompatible changes",
} as const;

/** Features - new functionality (priority 2) */
export const FEATURES: SectionCategory = {
	heading: "Features",
	priority: 2,
	commitTypes: ["feat"],
	description: "New functionality",
} as const;

/** Bug Fixes - bug corrections (priority 3) */
export const BUG_FIXES: SectionCategory = {
	heading: "Bug Fixes",
	priority: 3,
	commitTypes: ["fix"],
	description: "Bug corrections",
} as const;

/** Performance - performance improvements (priority 4) */
export const PERFORMANCE: SectionCategory = {
	heading: "Performance",
	priority: 4,
	commitTypes: ["perf"],
	description: "Performance improvements",
} as const;

/** Documentation - documentation changes (priority 5) */
export const DOCUMENTATION: SectionCategory = {
	heading: "Documentation",
	priority: 5,
	commitTypes: ["docs"],
	description: "Documentation changes",
} as const;

/** Refactoring - code restructuring (priority 6) */
export const REFACTORING: SectionCategory = {
	heading: "Refactoring",
	priority: 6,
	commitTypes: ["refactor"],
	description: "Code restructuring",
} as const;

/** Tests - test additions or modifications (priority 7) */
export const TESTS: SectionCategory = {
	heading: "Tests",
	priority: 7,
	commitTypes: ["test"],
	description: "Test additions or modifications",
} as const;

/** Build System - build configuration changes (priority 8) */
export const BUILD_SYSTEM: SectionCategory = {
	heading: "Build System",
	priority: 8,
	commitTypes: ["build"],
	description: "Build configuration changes",
} as const;

/** CI - continuous integration changes (priority 9) */
export const CI: SectionCategory = {
	heading: "CI",
	priority: 9,
	commitTypes: ["ci"],
	description: "Continuous integration changes",
} as const;

/** Dependencies - dependency updates (priority 10) */
export const DEPENDENCIES: SectionCategory = {
	heading: "Dependencies",
	priority: 10,
	commitTypes: ["deps"],
	description: "Dependency updates",
} as const;

/** Maintenance - general maintenance (priority 11) */
export const MAINTENANCE: SectionCategory = {
	heading: "Maintenance",
	priority: 11,
	commitTypes: ["chore", "style"],
	description: "General maintenance",
} as const;

/** Reverts - reverted changes (priority 12) */
export const REVERTS: SectionCategory = {
	heading: "Reverts",
	priority: 12,
	commitTypes: ["revert"],
	description: "Reverted changes",
} as const;

/** Other - uncategorized changes (priority 13) */
export const OTHER: SectionCategory = {
	heading: "Other",
	priority: 13,
	commitTypes: [],
	description: "Uncategorized changes",
} as const;

/**
 * All categories ordered by priority (ascending).
 */
export const CATEGORIES: readonly SectionCategory[] = [
	BREAKING_CHANGES,
	FEATURES,
	BUG_FIXES,
	PERFORMANCE,
	DOCUMENTATION,
	REFACTORING,
	TESTS,
	BUILD_SYSTEM,
	CI,
	DEPENDENCIES,
	MAINTENANCE,
	REVERTS,
	OTHER,
] as const;

/**
 * Set of all valid section heading strings (case-insensitive lookup).
 * Used by Layer 1 (remark-lint) to validate changeset headings.
 */
const headingToCategory = new Map<string, SectionCategory>(CATEGORIES.map((cat) => [cat.heading.toLowerCase(), cat]));

/**
 * Map from commit type string to its category.
 * Handles standard commit types. For `chore(deps)` and breaking `!` suffix,
 * use {@link resolveCommitType} instead.
 */
const commitTypeToCategory = new Map<string, SectionCategory>();
for (const cat of CATEGORIES) {
	for (const commitType of cat.commitTypes) {
		commitTypeToCategory.set(commitType, cat);
	}
}

/**
 * Resolve a conventional commit type (with optional scope and `!` suffix) to a category.
 *
 * @param type - The commit type (e.g., "feat", "fix", "chore")
 * @param scope - Optional scope (e.g., "deps" in `chore(deps):`)
 * @param breaking - Whether the commit has a `!` suffix indicating a breaking change
 * @returns The resolved section category
 */
export function resolveCommitType(type: string, scope?: string, breaking?: boolean): SectionCategory {
	if (breaking) {
		return BREAKING_CHANGES;
	}

	// chore(deps) and deps map to Dependencies
	if (type === "chore" && scope === "deps") {
		return DEPENDENCIES;
	}

	return commitTypeToCategory.get(type) ?? OTHER;
}

/**
 * Look up a category by its section heading text.
 * Comparison is case-insensitive.
 *
 * @param heading - The heading text (e.g., "Features", "Bug Fixes")
 * @returns The matching category, or `undefined` if not recognized
 */
export function fromHeading(heading: string): SectionCategory | undefined {
	return headingToCategory.get(heading.toLowerCase());
}

/**
 * Check whether a heading string matches a known category.
 * Comparison is case-insensitive.
 *
 * @param heading - The heading text to check
 * @returns `true` if the heading matches a known category
 */
export function isValidHeading(heading: string): boolean {
	return headingToCategory.has(heading.toLowerCase());
}

/**
 * Get all valid section heading strings.
 *
 * @returns Array of heading strings (e.g., ["Breaking Changes", "Features", ...])
 */
export function allHeadings(): readonly string[] {
	return CATEGORIES.map((cat) => cat.heading);
}
