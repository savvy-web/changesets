/**
 * Remark transform pipeline for post-processing CHANGELOG.md.
 *
 * Runs after `changeset version` to:
 * - Merge duplicate section headings
 * - Reorder sections by priority
 * - Deduplicate list items
 * - Aggregate contributor footnotes
 * - Consolidate issue link references
 * - Normalize markdown formatting
 *
 * @packageDocumentation
 */

import contributorFootnotes from "./contributor-footnotes.js";
import deduplicateItems from "./deduplicate-items.js";
import issueLinkRefs from "./issue-link-refs.js";
import mergeSections from "./merge-sections.js";
import normalizeFormat from "./normalize-format.js";
import reorderSections from "./reorder-sections.js";

export { contributorFootnotes, deduplicateItems, issueLinkRefs, mergeSections, normalizeFormat, reorderSections };

/**
 * Ordered array of all transform plugins in the correct execution order.
 *
 * Plugin ordering:
 * 1. `mergeSections` — merge duplicate h3 headings (must run before reorder)
 * 2. `reorderSections` — sort sections by category priority
 * 3. `deduplicateItems` — remove duplicate list items
 * 4. `contributorFootnotes` — aggregate contributor attributions
 * 5. `issueLinkRefs` — convert inline issue links to reference-style
 * 6. `normalizeFormat` — final cleanup (remove empty sections/lists)
 */
export const changesetTransformPreset = [
	mergeSections,
	reorderSections,
	deduplicateItems,
	contributorFootnotes,
	issueLinkRefs,
	normalizeFormat,
] as const;
