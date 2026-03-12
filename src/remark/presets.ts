/**
 * Remark preset collections for changeset lint rules and transform plugins.
 *
 * @internal
 */

import { AggregateDependencyTablesPlugin } from "./plugins/aggregate-dependency-tables.js";
import { ContributorFootnotesPlugin } from "./plugins/contributor-footnotes.js";
import { DeduplicateItemsPlugin } from "./plugins/deduplicate-items.js";
import { IssueLinkRefsPlugin } from "./plugins/issue-link-refs.js";
import { MergeSectionsPlugin } from "./plugins/merge-sections.js";
import { NormalizeFormatPlugin } from "./plugins/normalize-format.js";
import { ReorderSectionsPlugin } from "./plugins/reorder-sections.js";
import { ContentStructureRule } from "./rules/content-structure.js";
import { DependencyTableFormatRule } from "./rules/dependency-table-format.js";
import { HeadingHierarchyRule } from "./rules/heading-hierarchy.js";
import { RequiredSectionsRule } from "./rules/required-sections.js";
import { UncategorizedContentRule } from "./rules/uncategorized-content.js";

/**
 * Preset combining all changeset lint rules for convenient consumption.
 *
 * @example
 * ```typescript
 * import { SilkChangesetPreset } from "\@savvy-web/changesets/remark";
 * import remarkParse from "remark-parse";
 * import { unified } from "unified";
 *
 * const processor = unified().use(remarkParse);
 * for (const rule of SilkChangesetPreset) {
 *   processor.use(rule);
 * }
 * ```
 *
 * @public
 */
export const SilkChangesetPreset = [
	HeadingHierarchyRule,
	RequiredSectionsRule,
	ContentStructureRule,
	UncategorizedContentRule,
	DependencyTableFormatRule,
] as const;

/**
 * Ordered array of all transform plugins in the correct execution order.
 *
 * @remarks
 * Plugin ordering is significant:
 * 1. `AggregateDependencyTablesPlugin` -- merge duplicate dependency sections (must run first)
 * 2. `MergeSectionsPlugin` -- merge duplicate h3 headings (must run before reorder)
 * 3. `ReorderSectionsPlugin` -- sort sections by category priority
 * 4. `DeduplicateItemsPlugin` -- remove duplicate list items
 * 5. `ContributorFootnotesPlugin` -- aggregate contributor attributions
 * 6. `IssueLinkRefsPlugin` -- convert inline issue links to reference-style
 * 7. `NormalizeFormatPlugin` -- final cleanup (remove empty sections/lists)
 *
 * @public
 */
export const SilkChangesetTransformPreset = [
	AggregateDependencyTablesPlugin,
	MergeSectionsPlugin,
	ReorderSectionsPlugin,
	DeduplicateItemsPlugin,
	ContributorFootnotesPlugin,
	IssueLinkRefsPlugin,
	NormalizeFormatPlugin,
] as const;
