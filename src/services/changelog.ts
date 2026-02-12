/**
 * Changelog service tag definition.
 *
 * The actual formatting logic lives in `changelog/getReleaseLine.ts` and
 * `changelog/getDependencyReleaseLine.ts`. This module defines the service
 * interface and tag for dependency injection.
 *
 * @packageDocumentation
 */

import type { Effect } from "effect";
import { Context } from "effect";

import type { ChangesetOptions } from "../schemas/options.js";
import type { ModCompWithPackage, NewChangesetWithCommit, VersionType } from "../vendor/types.js";
import type { GitHubService } from "./github.js";
import type { MarkdownService } from "./markdown.js";

/**
 * Service for changelog formatting.
 */
export class ChangelogService extends Context.Tag("ChangelogService")<
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
