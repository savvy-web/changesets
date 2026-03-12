/**
 * Consolidated remark plugins for changeset validation and CHANGELOG transformation.
 *
 * Re-exports all lint rules and transform plugins from a single entry point.
 *
 * @packageDocumentation
 */

// Transform plugins
export { AggregateDependencyTablesPlugin } from "./plugins/aggregate-dependency-tables.js";
export { ContributorFootnotesPlugin } from "./plugins/contributor-footnotes.js";
export { DeduplicateItemsPlugin } from "./plugins/deduplicate-items.js";
export { IssueLinkRefsPlugin } from "./plugins/issue-link-refs.js";
export { MergeSectionsPlugin } from "./plugins/merge-sections.js";
export { NormalizeFormatPlugin } from "./plugins/normalize-format.js";
export { ReorderSectionsPlugin } from "./plugins/reorder-sections.js";
// Presets
export { SilkChangesetPreset, SilkChangesetTransformPreset } from "./presets.js";
// Lint rules
export { ContentStructureRule } from "./rules/content-structure.js";
export { DependencyTableFormatRule } from "./rules/dependency-table-format.js";
export { HeadingHierarchyRule } from "./rules/heading-hierarchy.js";
export { RequiredSectionsRule } from "./rules/required-sections.js";
export { UncategorizedContentRule } from "./rules/uncategorized-content.js";
