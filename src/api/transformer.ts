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

import { ContributorFootnotesPlugin } from "../remark/plugins/contributor-footnotes.js";
import { DeduplicateItemsPlugin } from "../remark/plugins/deduplicate-items.js";
import { IssueLinkRefsPlugin } from "../remark/plugins/issue-link-refs.js";
import { MergeSectionsPlugin } from "../remark/plugins/merge-sections.js";
import { NormalizeFormatPlugin } from "../remark/plugins/normalize-format.js";
import { ReorderSectionsPlugin } from "../remark/plugins/reorder-sections.js";

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
			.use(MergeSectionsPlugin)
			.use(ReorderSectionsPlugin)
			.use(DeduplicateItemsPlugin)
			.use(ContributorFootnotesPlugin)
			.use(IssueLinkRefsPlugin)
			.use(NormalizeFormatPlugin)
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
