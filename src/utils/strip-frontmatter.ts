/**
 * Utility for stripping YAML frontmatter from changeset files.
 *
 * Changeset `.md` files contain YAML frontmatter (delimited by `---`)
 * that must be removed before remark-lint processing.
 *
 */

/**
 * Strip leading YAML frontmatter from a markdown string.
 *
 * Removes the `---\n...\n---\n` block at the start of the content.
 * If no frontmatter is present, the content is returned as-is.
 *
 * @param content - Raw markdown string potentially containing frontmatter
 * @returns The markdown content with frontmatter removed
 */
export function stripFrontmatter(content: string): string {
	return content.replace(/^---\n[\s\S]*?\n---\n?/, "");
}
