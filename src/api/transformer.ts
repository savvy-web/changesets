/**
 * Class-based API wrapper for changelog transformation.
 *
 * Provides a static class interface that runs all remark transform
 * plugins against CHANGELOG markdown content.
 */

import { readFileSync, writeFileSync } from "node:fs";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";

import {
	contributorFootnotes,
	deduplicateItems,
	issueLinkRefs,
	mergeSections,
	normalizeFormat,
	reorderSections,
} from "../remark-transform/index.js";

/**
 * Static class for transforming CHANGELOG.md files.
 *
 * Runs all six remark transform plugins in the correct order:
 * merge-sections, reorder-sections, deduplicate-items,
 * contributor-footnotes, issue-link-refs, normalize-format.
 *
 * @example
 * ```typescript
 * import { ChangelogTransformer } from "\@savvy-web/changesets";
 *
 * // Transform a string
 * const cleaned = ChangelogTransformer.transformContent(rawMarkdown);
 *
 * // Transform a file in-place
 * ChangelogTransformer.transformFile("CHANGELOG.md");
 * ```
 *
 * @public
 */
export class ChangelogTransformer {
	private constructor() {}

	/**
	 * Transform CHANGELOG markdown content by running all transform plugins.
	 *
	 * @param content - Raw CHANGELOG markdown string
	 * @returns The transformed markdown string
	 */
	static transformContent(content: string): string {
		const processor = unified()
			.use(remarkParse)
			.use(remarkGfm)
			.use(mergeSections)
			.use(reorderSections)
			.use(deduplicateItems)
			.use(contributorFootnotes)
			.use(issueLinkRefs)
			.use(normalizeFormat)
			.use(remarkStringify);

		const file = processor.processSync(content);
		return String(file);
	}

	/**
	 * Transform a CHANGELOG file in-place.
	 *
	 * Reads the file, runs all transform plugins, and writes the result back.
	 *
	 * @param filePath - Path to the CHANGELOG.md file
	 */
	static transformFile(filePath: string): void {
		const content = readFileSync(filePath, "utf-8");
		const result = ChangelogTransformer.transformContent(content);
		writeFileSync(filePath, result, "utf-8");
	}
}

/**
 * Create a unified processor configured with all transform plugins.
 *
 * Useful for consumers who want to customize the pipeline or add
 * additional plugins.
 *
 * @returns A configured unified processor
 *
 * @internal
 */
export function createTransformProcessor(): ReturnType<typeof unified> {
	return unified()
		.use(remarkParse)
		.use(remarkGfm)
		.use(mergeSections)
		.use(reorderSections)
		.use(deduplicateItems)
		.use(contributorFootnotes)
		.use(issueLinkRefs)
		.use(normalizeFormat)
		.use(remarkStringify) as unknown as ReturnType<typeof unified>;
}
