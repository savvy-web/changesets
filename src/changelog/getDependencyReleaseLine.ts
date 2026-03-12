/**
 * Core formatter: getDependencyReleaseLine.
 *
 * Formats dependency update entries as a structured markdown table.
 */

import { Effect } from "effect";

import type { DependencyTableRow, DependencyTableType } from "../schemas/dependency-table.js";
import type { ChangesetOptions } from "../schemas/options.js";
import { GitHubService } from "../services/github.js";
import { serializeDependencyTableToMarkdown } from "../utils/dependency-table.js";
import type { ModCompWithPackage, NewChangesetWithCommit } from "../vendor/types.js";

/** Field-to-type mapping for inferring dependency type from packageJson. */
const FIELD_MAP: readonly [string, DependencyTableType][] = [
	["dependencies", "dependency"],
	["devDependencies", "devDependency"],
	["peerDependencies", "peerDependency"],
	["optionalDependencies", "optionalDependency"],
] as const;

/**
 * Infer the dependency table type from a package's packageJson.
 */
function inferDependencyType(dep: ModCompWithPackage): DependencyTableType {
	const pkg = dep.packageJson as Record<string, unknown>;
	for (const [field, type] of FIELD_MAP) {
		const section = pkg[field];
		if (typeof section === "object" && section !== null && dep.name in (section as Record<string, unknown>)) {
			return type;
		}
	}
	return "dependency";
}

/**
 * Format dependency release lines as a markdown table.
 *
 * @param _changesets - Changesets that caused dependency updates (unused in table format)
 * @param dependenciesUpdated - Dependencies that were updated
 * @param _options - Validated configuration options (unused in table format)
 * @returns Formatted markdown table string, or empty string if no deps updated
 */
export function getDependencyReleaseLine(
	_changesets: NewChangesetWithCommit[],
	dependenciesUpdated: ModCompWithPackage[],
	_options: ChangesetOptions,
): Effect.Effect<string, never, GitHubService> {
	return Effect.gen(function* () {
		if (dependenciesUpdated.length === 0) return "";

		// TODO: GitHubService is no longer used for commit links in table format.
		// Kept to maintain the existing type signature contract. Consider removing
		// the GitHubService dependency in a future breaking change.
		yield* GitHubService;

		const rows: DependencyTableRow[] = dependenciesUpdated.map((dep) => ({
			dependency: dep.name,
			type: inferDependencyType(dep),
			action: "updated" as const,
			from: dep.oldVersion,
			to: dep.newVersion,
		}));

		return serializeDependencyTableToMarkdown(rows);
	});
}
