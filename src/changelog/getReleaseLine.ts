/**
 * Core formatter: getReleaseLine.
 *
 * Formats a single changeset into a changelog entry. Supports both
 * section-aware changesets (with h2 headings) and flat-text changesets
 * (backward-compatible single-line output).
 *
 * @packageDocumentation
 */

import { Effect, Schema } from "effect";

import { resolveCommitType } from "../categories/index.js";
import { GitHubInfoSchema } from "../schemas/github.js";
import type { ChangesetOptions } from "../schemas/options.js";
import { GitHubService } from "../services/github.js";
import { parseCommitMessage } from "../utils/commit-parser.js";
import { parseIssueReferences } from "../utils/issue-refs.js";
import { logWarning } from "../utils/logger.js";
import { parseChangesetSections } from "../utils/section-parser.js";
import type { GitHubCommitInfo } from "../vendor/github-info.js";
import type { NewChangesetWithCommit, VersionType } from "../vendor/types.js";
import { formatChangelogEntry, formatPRAndUserAttribution } from "./formatting.js";

/**
 * Format a single changeset as an Effect program.
 *
 * @param changeset - The changeset to format
 * @param versionType - The semantic version bump type
 * @param options - Validated configuration options
 * @returns Formatted markdown string
 */
export function getReleaseLine(
	changeset: NewChangesetWithCommit,
	versionType: VersionType,
	options: ChangesetOptions,
): Effect.Effect<string, never, GitHubService> {
	return Effect.gen(function* () {
		// 1. Fetch GitHub info if we have a commit
		let commitInfo: GitHubCommitInfo | null = null;
		if (changeset.commit) {
			const github = yield* GitHubService;
			commitInfo = yield* github.getInfo({ commit: changeset.commit, repo: options.repo }).pipe(
				// Validate response shape
				Effect.flatMap((raw) =>
					Schema.decodeUnknown(GitHubInfoSchema)(raw).pipe(
						Effect.map(() => raw),
						Effect.catchAll(() => Effect.succeed(raw)),
					),
				),
				Effect.catchAll((error) => {
					logWarning("Could not fetch GitHub info for commit:", changeset.commit ?? "", String(error));
					return Effect.succeed(null);
				}),
			);
		}

		// 2. Parse summary for sections
		const parsed = parseChangesetSections(changeset.summary);

		// 3. Parse first line for conventional commit
		const firstLine = changeset.summary.split("\n")[0];
		const commitMsg = parseCommitMessage(firstLine);

		// 4. Extract issue references from body
		const bodyText = changeset.summary.split("\n").slice(1).join("\n");
		const issueRefs = parseIssueReferences(bodyText);

		// 5. Build attribution suffix
		const attribution = commitInfo
			? formatPRAndUserAttribution(
					commitInfo.pull ?? undefined,
					commitInfo.user ?? undefined,
					commitInfo.links as { pull?: string; user?: string },
				)
			: "";

		// 6. Section-aware formatting (h2 headings present)
		if (parsed.sections.length > 0) {
			const lines: string[] = [];

			if (parsed.preamble) {
				lines.push(parsed.preamble);
				lines.push("");
			}

			for (const section of parsed.sections) {
				lines.push(`### ${section.category.heading}`);
				lines.push("");

				// Format content as list items with commit link
				const commitPrefix = changeset.commit
					? `[\`${changeset.commit.substring(0, 7)}\`](https://github.com/${options.repo}/commit/${changeset.commit}) `
					: "";

				if (section.content) {
					// Content may already contain list items; prefix first line
					const contentLines = section.content.split("\n");
					const firstContentLine = contentLines[0];
					if (firstContentLine.startsWith("- ") || firstContentLine.startsWith("* ")) {
						// Content already has list markers
						lines.push(`${firstContentLine.substring(0, 2)}${commitPrefix}${firstContentLine.substring(2)}`);
						lines.push(...contentLines.slice(1));
					} else {
						lines.push(`- ${commitPrefix}${section.content}`);
					}
				}
				lines.push("");
			}

			const result = lines.join("\n").trimEnd();
			return `${result}${attribution}`;
		}

		// 7. Flat-text formatting (backward-compatible)
		const commitType = commitMsg.type ?? versionType;
		const category = resolveCommitType(commitType, commitMsg.scope, commitMsg.breaking);

		const entryInput: Parameters<typeof formatChangelogEntry>[0] = {
			type: category.heading,
			summary: changeset.summary,
			issues: issueRefs,
		};
		if (changeset.commit) entryInput.commit = changeset.commit;

		const entry = formatChangelogEntry(entryInput, { repo: options.repo });

		return `- ${entry}${attribution}`;
	});
}
