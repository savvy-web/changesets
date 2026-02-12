/**
 * Markdown service for parsing and stringifying mdast trees.
 *
 * @packageDocumentation
 */

import { Context, Effect, Layer } from "effect";
import type { Root } from "mdast";

import { parseMarkdown, stringifyMarkdown } from "../utils/remark-pipeline.js";

/**
 * Service for markdown parsing and stringification.
 */
export class MarkdownService extends Context.Tag("MarkdownService")<
	MarkdownService,
	{
		/** Parse a markdown string into an mdast AST. */
		readonly parse: (content: string) => Effect.Effect<Root>;
		/** Stringify an mdast AST back to markdown. */
		readonly stringify: (tree: Root) => Effect.Effect<string>;
	}
>() {}

/**
 * Live layer wrapping the remark-pipeline functions.
 */
export const MarkdownLive = Layer.succeed(MarkdownService, {
	parse: (content) => Effect.sync(() => parseMarkdown(content)),
	stringify: (tree) => Effect.sync(() => stringifyMarkdown(tree)),
});
