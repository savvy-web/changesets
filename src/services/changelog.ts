/**
 * Changelog service tag definition.
 *
 * The actual formatting logic lives in `changelog/getReleaseLine.ts` and
 * `changelog/getDependencyReleaseLine.ts`. This module defines the service
 * interface and tag for dependency injection.
 */

import type { Effect } from "effect";
import { Context } from "effect";

import type { ChangesetOptions } from "../schemas/options.js";
import type { ModCompWithPackage, NewChangesetWithCommit, VersionType } from "../vendor/types.js";
import type { GitHubService } from "./github.js";
import type { MarkdownService } from "./markdown.js";

/**
 * Base tag for ChangelogService.
 *
 * @privateRemarks
 * This export is required for api-extractor documentation generation.
 * Effect's Context.Tag creates an anonymous base class that must be
 * explicitly exported to avoid "forgotten export" warnings. Do not delete.
 *
 * @internal
 */
export const ChangelogServiceTag = Context.Tag("ChangelogService");

/**
 * Service for changelog formatting.
 *
 * @remarks
 * This service tag defines the interface. Use the Changesets API entry point
 * (`\@savvy-web/changesets/changelog`) or the {@link Changelog} class for
 * the concrete implementation.
 *
 * @public
 */
export class ChangelogService extends ChangelogServiceTag<
	ChangelogService,
	{
		/** Format a single changeset release line. */
		readonly formatReleaseLine: (
			changeset: NewChangesetWithCommit,
			versionType: VersionType,
			options: ChangesetOptions,
		) => Effect.Effect<string, never, GitHubService | MarkdownService>;

		/** Format dependency update release lines. */
		readonly formatDependencyReleaseLine: (
			changesets: NewChangesetWithCommit[],
			dependenciesUpdated: ModCompWithPackage[],
			options: ChangesetOptions,
		) => Effect.Effect<string, never, GitHubService>;
	}
>() {}
