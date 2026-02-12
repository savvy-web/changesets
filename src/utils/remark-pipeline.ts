/**
 * Remark processing pipeline for markdown parsing and stringification.
 *
 * @packageDocumentation
 */

import type { Root } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";

/**
 * Create a unified processor configured with remark-parse, remark-gfm,
 * and remark-stringify.
 *
 * @returns A configured unified processor
 */
export function createRemarkProcessor() {
	return unified().use(remarkParse).use(remarkGfm).use(remarkStringify);
}

/**
 * Parse a markdown string into an mdast AST synchronously.
 *
 * @param content - Raw markdown string
 * @returns The parsed AST root node
 */
export function parseMarkdown(content: string): Root {
	const processor = createRemarkProcessor();
	return processor.parse(content);
}

/**
 * Stringify an mdast AST back to a markdown string synchronously.
 *
 * @param tree - The mdast root node
 * @returns The serialized markdown string
 */
export function stringifyMarkdown(tree: Root): string {
	const processor = createRemarkProcessor();
	return processor.stringify(tree);
}
