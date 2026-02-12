/**
 * Class-based API wrapper for changelog formatting.
 *
 * Provides a static class interface that delegates to the underlying
 * Changesets API-compatible default export.
 *
 * @packageDocumentation
 */

import changelogFunctions from "../changelog/index.js";
import type { ModCompWithPackage, NewChangesetWithCommit, VersionType } from "../vendor/types.js";

/**
 * Static class wrapper for changelog operations.
 *
 * @example
 * ```ts
 * import { Changelog } from "\@savvy-web/changesets";
 *
 * const line = await Changelog.formatReleaseLine(changeset, "minor", { repo: "owner/repo" });
 * ```
 */
export class Changelog {
	private constructor() {}

	/**
	 * Format a single changeset into a changelog release line.
	 *
	 * @param changeset - The changeset to format
	 * @param versionType - The semantic version bump type
	 * @param options - Configuration with `repo` in `owner/repo` format
	 * @returns Formatted markdown string
	 */
	static formatReleaseLine(
		changeset: NewChangesetWithCommit,
		versionType: VersionType,
		options: Record<string, unknown> | null,
	): Promise<string> {
		return changelogFunctions.getReleaseLine(changeset, versionType, options);
	}

	/**
	 * Format dependency update release lines.
	 *
	 * @param changesets - Changesets that caused dependency updates
	 * @param dependenciesUpdated - Dependencies that were updated
	 * @param options - Configuration with `repo` in `owner/repo` format
	 * @returns Formatted markdown string
	 */
	static formatDependencyReleaseLine(
		changesets: NewChangesetWithCommit[],
		dependenciesUpdated: ModCompWithPackage[],
		options: Record<string, unknown> | null,
	): Promise<string> {
		return changelogFunctions.getDependencyReleaseLine(changesets, dependenciesUpdated, options);
	}
}
