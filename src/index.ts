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

// === Effect Primitives (for Effect-native consumers) ===

// Services
// export { ChangelogService } from "./services/changelog.js";
// export { GitHubService } from "./services/github.js";
// export { MarkdownService } from "./services/markdown.js";
// export { ValidationService } from "./services/validation.js";

// Layers
// export { ChangelogLive } from "./services/changelog.js";
// export { GitHubLive, GitHubTest } from "./services/github.js";
// export { MarkdownLive } from "./services/markdown.js";

// Schemas
export { SectionCategorySchema } from "./categories/types.js";
// Tagged Errors
export {
	ChangesetValidationError,
	ConfigurationError,
	GitHubApiError,
	MarkdownParseError,
} from "./errors.js";
export type {
	Changeset,
	ChangesetOptions,
	DependencyType,
	DependencyUpdate,
	GitHubInfo,
	VersionType,
} from "./schemas/index.js";
export {
	ChangesetOptionsSchema,
	ChangesetSchema,
	ChangesetSummarySchema,
	CommitHashSchema,
	DependencyTypeSchema,
	DependencyUpdateSchema,
	GitHubInfoSchema,
	IssueNumberSchema,
	NonEmptyString,
	PositiveInteger,
	RepoSchema,
	UrlOrMarkdownLinkSchema,
	UsernameSchema,
	VersionTypeSchema,
	validateChangesetOptions,
} from "./schemas/index.js";

// === Class-Based API (for higher-level consumers) ===

// export { Changelog } from "./api/changelog.js";
// export { ChangesetLinter } from "./api/linter.js";
// export { ChangelogTransformer } from "./api/transformer.js";
export { Categories } from "./api/categories.js";

// === Shared Types ===

export type { SectionCategory } from "./categories/types.js";

// === Categories (constants and functions for Effect-native consumers) ===

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
