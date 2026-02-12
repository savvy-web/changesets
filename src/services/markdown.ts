/**
 * Markdown service for parsing and stringifying mdast trees.
 */

import { Context, Effect, Layer } from "effect";
import type { Root } from "mdast";

import { parseMarkdown, stringifyMarkdown } from "../utils/remark-pipeline.js";

/**
 * Service interface for markdown parsing and stringification.
 *
 * @internal
 */
export interface MarkdownServiceShape {
	/** Parse a markdown string into an mdast AST. */
	readonly parse: (content: string) => Effect.Effect<Root>;
	/** Stringify an mdast AST back to markdown. */
	readonly stringify: (tree: Root) => Effect.Effect<string>;
}

const _tag = Context.Tag("MarkdownService");

/**
 * Base class for MarkdownService.
 *
 * @privateRemarks
 * This export is required for api-extractor documentation generation.
 * Effect's Context.Tag creates an anonymous base class that must be
 * explicitly exported to avoid "forgotten export" warnings. Do not delete.
 *
 * @internal
 */
export const MarkdownServiceBase = _tag<MarkdownService, MarkdownServiceShape>();

/**
 * Service for markdown parsing and stringification.
 *
 * @see {@link MarkdownLive} for the production layer
 *
 * @public
 */
export class MarkdownService extends MarkdownServiceBase {}

/**
 * Live layer wrapping the remark-pipeline functions.
 *
 * @public
 */
export const MarkdownLive = Layer.succeed(MarkdownService, {
	parse: (content) => Effect.sync(() => parseMarkdown(content)),
	stringify: (tree) => Effect.sync(() => stringifyMarkdown(tree)),
});
