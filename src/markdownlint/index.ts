/**
 * markdownlint custom rules for validating changeset file structure.
 *
 * Provides the same validation as the remark-lint rules but using
 * markdownlint's micromark token API for integration with
 * markdownlint-cli2 and the VS Code markdownlint extension.
 *
 * - `changeset-heading-hierarchy` (CSH001): Enforce h2 start, no h1, no depth skips
 * - `changeset-required-sections` (CSH002): Validate section headings match known categories
 * - `changeset-content-structure` (CSH003): Content quality validation
 * - `changeset-uncategorized-content` (CSH004): Reject content before first h2 heading
 *
 * @packageDocumentation
 */

import type { Rule } from "markdownlint";

import { ContentStructureRule } from "./rules/content-structure.js";
import { HeadingHierarchyRule } from "./rules/heading-hierarchy.js";
import { RequiredSectionsRule } from "./rules/required-sections.js";
import { UncategorizedContentRule } from "./rules/uncategorized-content.js";

export { ContentStructureRule, HeadingHierarchyRule, RequiredSectionsRule, UncategorizedContentRule };

/**
 * All changeset rules as an array for markdownlint-cli2 `customRules` config.
 *
 * @example
 * ```json
 * {
 *   "customRules": ["@savvy-web/changesets/markdownlint"]
 * }
 * ```
 *
 * @public
 */
const SilkChangesetsRules: Rule[] = [
	HeadingHierarchyRule,
	RequiredSectionsRule,
	ContentStructureRule,
	UncategorizedContentRule,
];

export default SilkChangesetsRules;
