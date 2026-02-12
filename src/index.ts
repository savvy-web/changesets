/**
 * \@savvy-web/changesets
 *
 * Custom changelog formatter and markdown processing pipeline for the Silk Suite.
 * Provides structured changeset sections, remark-based validation and transformation,
 * and an Effect CLI.
 *
 * This module exposes two API surfaces:
 * - **Effect primitives**: Services, layers, schemas, and tagged errors for Effect-native consumers
 * - **Class-based API**: Static class wrappers for higher-level consumers
 *
 * @packageDocumentation
 */

// === Class-Based API (for higher-level consumers) ===

export { Categories } from "./api/categories.js";
export { Changelog } from "./api/changelog.js";
export type { LintMessage } from "./api/linter.js";
export { ChangesetLinter } from "./api/linter.js";

// === Effect Services ===

export { ChangelogService } from "./services/changelog.js";
export { GitHubService } from "./services/github.js";
export { MarkdownService } from "./services/markdown.js";

// === Effect Layers ===

export { GitHubLive, makeGitHubTest } from "./services/github.js";
export { MarkdownLive } from "./services/markdown.js";

// === Tagged Errors ===

export {
	ChangesetValidationError,
	ChangesetValidationErrorBase,
	ConfigurationError,
	ConfigurationErrorBase,
	GitHubApiError,
	GitHubApiErrorBase,
	MarkdownParseError,
	MarkdownParseErrorBase,
} from "./errors.js";

// === Schemas ===

export { SectionCategorySchema } from "./categories/types.js";
export type { Changeset, DependencyType, DependencyUpdate } from "./schemas/changeset.js";
export {
	ChangesetSchema,
	ChangesetSummarySchema,
	DependencyTypeSchema,
	DependencyUpdateSchema,
} from "./schemas/changeset.js";
export type { VersionType } from "./schemas/git.js";
export { CommitHashSchema, VersionTypeSchema } from "./schemas/git.js";
export type { GitHubInfo } from "./schemas/github.js";
export {
	GitHubInfoSchema,
	IssueNumberSchema,
	UrlOrMarkdownLinkSchema,
	UsernameSchema,
} from "./schemas/github.js";
export type { ChangesetOptions } from "./schemas/options.js";
export {
	ChangesetOptionsSchema,
	RepoSchema,
	validateChangesetOptions,
} from "./schemas/options.js";
export { NonEmptyString, PositiveInteger } from "./schemas/primitives.js";

// === Types ===

export type { SectionCategory } from "./categories/types.js";
export type { GitHubCommitInfo } from "./vendor/github-info.js";

// === Categories ===

export {
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
} from "./categories/index.js";
