/**
 * Workspace utilities for multi-package changelog processing.
 *
 * Provides package manager detection, changeset version command
 * generation, and workspace changelog discovery.
 *
 * @internal
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { WorkspaceInfos } from "workspace-tools";
import { getWorkspaceInfos } from "workspace-tools";

/**
 * Supported package managers.
 */
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

/**
 * A discovered workspace changelog entry.
 */
export interface WorkspaceChangelog {
	/** Package name */
	name: string;
	/** Absolute path to the package directory */
	path: string;
	/** Absolute path to the CHANGELOG.md file */
	changelogPath: string;
}

/**
 * Static utility class for workspace operations.
 *
 * @example
 * ```typescript
 * import { Workspace } from "\@savvy-web/changesets";
 *
 * const pm = Workspace.detectPackageManager("/path/to/project");
 * const cmd = Workspace.getChangesetVersionCommand(pm);
 * const changelogs = Workspace.discoverChangelogs("/path/to/project");
 * ```
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Intentional pattern for TSDoc discoverability
export class Workspace {
	/**
	 * Detect the package manager from the root package.json `packageManager` field.
	 *
	 * Parses the `packageManager` field (e.g., `pnpm@9.0.0`) and extracts the
	 * manager name. Falls back to `"npm"` if the field is missing or unrecognized.
	 *
	 * @param cwd - Project root directory (defaults to `process.cwd()`)
	 * @returns The detected package manager
	 */
	static detectPackageManager(cwd: string = process.cwd()): PackageManager {
		const packageJsonPath = join(cwd, "package.json");

		if (!existsSync(packageJsonPath)) {
			return "npm";
		}

		try {
			const content = readFileSync(packageJsonPath, "utf-8");
			const pkg = JSON.parse(content) as { packageManager?: string };

			if (pkg.packageManager) {
				const match = pkg.packageManager.match(/^(npm|pnpm|yarn|bun)@/);
				if (match) {
					return match[1] as PackageManager;
				}
			}
		} catch {
			// Failed to read or parse package.json
		}

		return "npm";
	}

	/**
	 * Get the full exec command string for running `changeset version`.
	 *
	 * @param pm - The package manager to use
	 * @returns The shell command string (e.g., `"pnpm exec changeset version"`)
	 */
	static getChangesetVersionCommand(pm: PackageManager): string {
		switch (pm) {
			case "pnpm":
				return "pnpm exec changeset version";
			case "yarn":
				return "yarn exec changeset version";
			case "bun":
				return "bun x changeset version";
			default:
				return "npx changeset version";
		}
	}

	/**
	 * Discover all CHANGELOG.md files across workspace packages.
	 *
	 * Uses `workspace-tools` to enumerate all workspace packages, checks each
	 * for a `CHANGELOG.md`, and always includes the root if it has one.
	 * Deduplicates the root if it also appears as a workspace entry.
	 *
	 * @param cwd - Project root directory (defaults to `process.cwd()`)
	 * @returns Array of discovered changelog entries
	 */
	static discoverChangelogs(cwd: string = process.cwd()): WorkspaceChangelog[] {
		const resolvedCwd = resolve(cwd);
		const results: WorkspaceChangelog[] = [];
		const seen = new Set<string>();

		// Discover workspace packages
		try {
			const workspaces: WorkspaceInfos = getWorkspaceInfos(resolvedCwd) ?? [];
			for (const ws of workspaces) {
				const changelogPath = join(ws.path, "CHANGELOG.md");
				if (existsSync(changelogPath) && !seen.has(ws.path)) {
					seen.add(ws.path);
					results.push({
						name: ws.name,
						path: ws.path,
						changelogPath,
					});
				}
			}
		} catch {
			// workspace-tools failed — fall through to root check
		}

		// Always check root (dedup if already found as workspace entry)
		if (!seen.has(resolvedCwd)) {
			const rootChangelog = join(resolvedCwd, "CHANGELOG.md");
			if (existsSync(rootChangelog)) {
				// Read root package name
				let rootName = "root";
				try {
					const pkg = JSON.parse(readFileSync(join(resolvedCwd, "package.json"), "utf-8")) as {
						name?: string;
					};
					if (pkg.name) {
						rootName = pkg.name;
					}
				} catch {
					// Use default name
				}

				results.push({
					name: rootName,
					path: resolvedCwd,
					changelogPath: rootChangelog,
				});
			}
		}

		return results;
	}
}
