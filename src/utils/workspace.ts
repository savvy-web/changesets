/**
 * Workspace utilities for multi-package changelog processing.
 *
 * @remarks
 * Provides package manager detection, changeset version command
 * generation, and workspace changelog discovery. Used by the CLI
 * `version` command to orchestrate CHANGELOG post-processing across
 * all packages in a monorepo.
 *
 * Package manager detection reads the `packageManager` field from
 * the root `package.json` (as specified by
 * {@link https://nodejs.org/api/corepack.html | Corepack}).
 * Workspace discovery uses the `workspace-tools` library to enumerate
 * packages from the workspace configuration.
 *
 * @internal
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { WorkspaceInfos } from "workspace-tools";
import { getWorkspaceInfos } from "workspace-tools";

/**
 * Supported package managers.
 *
 * @remarks
 * Detected from the `packageManager` field in root `package.json`
 * (e.g., `pnpm@9.0.0`). Falls back to `"npm"` if unrecognized.
 *
 * @internal
 */
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

/**
 * A discovered workspace changelog entry.
 *
 * @remarks
 * Represents a package within a workspace that has a `CHANGELOG.md` file.
 * Used by the CLI `version` command to iterate over all changelogs for
 * post-processing.
 *
 * @internal
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
 * @remarks
 * Provides three capabilities needed by the CLI `version` command:
 * 1. Detect the active package manager from `package.json`
 * 2. Generate the correct `changeset version` shell command
 * 3. Discover all `CHANGELOG.md` files across workspace packages
 *
 * @example
 * ```typescript
 * import { Workspace } from "../utils/workspace.js";
 *
 * const pm = Workspace.detectPackageManager("/path/to/project");
 * const cmd = Workspace.getChangesetVersionCommand(pm);
 * const changelogs = Workspace.discoverChangelogs("/path/to/project");
 * for (const entry of changelogs) {
 *   console.log(`${entry.name}: ${entry.changelogPath}`);
 * }
 * ```
 *
 * @internal
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Intentional pattern for TSDoc discoverability
export class Workspace {
	/**
	 * Detect the package manager from the root `package.json` `packageManager` field.
	 *
	 * @remarks
	 * Parses the `packageManager` field (e.g., `pnpm@9.0.0`) and extracts the
	 * manager name using a regex match against the known set: `npm`, `pnpm`,
	 * `yarn`, `bun`. Falls back to `"npm"` if the field is missing, the file
	 * cannot be read, or the manager is unrecognized.
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
	 * @remarks
	 * Maps each package manager to its appropriate exec/run syntax:
	 * - `pnpm` → `pnpm exec changeset version`
	 * - `yarn` → `yarn exec changeset version`
	 * - `bun` → `bun x changeset version`
	 * - `npm` (default) → `npx changeset version`
	 *
	 * @param pm - The package manager to use
	 * @returns The shell command string
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
	 * Discover all `CHANGELOG.md` files across workspace packages.
	 *
	 * @remarks
	 * Uses `workspace-tools` to enumerate all workspace packages, checks each
	 * for a `CHANGELOG.md`, and always includes the root if it has one.
	 * Deduplicates by absolute path so the root is not counted twice if it
	 * also appears as a workspace entry. If `workspace-tools` fails (e.g.,
	 * in a non-workspace project), falls through to the root-only check.
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
