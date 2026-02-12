/**
 * Remark-lint rules for validating changeset file structure.
 *
 * Provides custom lint rules:
 * - `heading-hierarchy`: Enforce h2 start, no h1, no depth skips
 * - `required-sections`: Validate section headings match known categories
 * - `content-structure`: Content quality validation
 *
 * @packageDocumentation
 */

export { default as contentStructure } from "./content-structure.js";
export { default as headingHierarchy } from "./heading-hierarchy.js";
export { default as requiredSections } from "./required-sections.js";

import contentStructure from "./content-structure.js";
import headingHierarchy from "./heading-hierarchy.js";
import requiredSections from "./required-sections.js";

/**
 * Preset combining all changeset lint rules for convenient consumption.
 *
 * @example
 * ```ts
 * import { changesetPreset } from "\@savvy-web/changesets/remark-lint";
 *
 * const processor = unified()
 *   .use(remarkParse);
 *
 * for (const rule of changesetPreset) {
 *   processor.use(rule);
 * }
 * ```
 */
export const changesetPreset = [headingHierarchy, requiredSections, contentStructure] as const;
