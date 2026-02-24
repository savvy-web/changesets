/**
 * Utilities for updating version fields in additional JSON files.
 *
 * Reads `versionFiles` from `.changeset/config.json`, resolves glob patterns,
 * determines the correct version per file (from the nearest workspace package),
 * and updates JSONPath-specified fields in each matched file.
 *
 * @internal
 */

import { existsSync, globSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { Schema } from "effect";
import type { WorkspaceInfos } from "workspace-tools";
import { getWorkspaceInfos } from "workspace-tools";

import type { VersionFileConfig } from "../schemas/version-files.js";
import { VersionFilesSchema } from "../schemas/version-files.js";
import { jsonPathGet, jsonPathSet } from "./jsonpath.js";

/** Result of a single version file update. */
export interface VersionFileUpdate {
	/** Absolute path to the updated file. */
	filePath: string;
	/** JSONPath expressions that were updated. */
	jsonPaths: readonly string[];
	/** The version that was written. */
	version: string;
	/** Previous values found at those paths. */
	previousValues: unknown[];
}

/** A discovered workspace package with its version. */
interface WorkspaceVersion {
	/** Package name. */
	name: string;
	/** Absolute path to the package directory. */
	path: string;
	/** Current version from package.json. */
	version: string;
}

/**
 * Static utility class for version file operations.
 *
 * @example
 * ```typescript
 * import { VersionFiles } from "./version-files.js";
 *
 * const configs = VersionFiles.readConfig("/path/to/project");
 * if (configs) {
 *   const updates = VersionFiles.processVersionFiles("/path/to/project", configs);
 * }
 * ```
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Intentional pattern for TSDoc discoverability
export class VersionFiles {
	/**
	 * Read and validate the `versionFiles` config from `.changeset/config.json`.
	 *
	 * @param cwd - Project root directory
	 * @returns Parsed config array, or `undefined` if not configured
	 */
	static readConfig(cwd: string): readonly VersionFileConfig[] | undefined {
		const configPath = join(cwd, ".changeset", "config.json");

		if (!existsSync(configPath)) {
			return undefined;
		}

		try {
			const raw = readFileSync(configPath, "utf-8");
			const content = stripJsoncComments(raw);
			const config = JSON.parse(content) as Record<string, unknown>;

			// changelog is expected to be a tuple: [formatter, options]
			const changelog = config.changelog;
			if (!Array.isArray(changelog) || changelog.length < 2) {
				return undefined;
			}

			const options = changelog[1] as Record<string, unknown>;
			if (!options || typeof options !== "object" || !("versionFiles" in options)) {
				return undefined;
			}

			const decoded = Schema.decodeUnknownSync(VersionFilesSchema)(options.versionFiles);
			return decoded.length > 0 ? decoded : undefined;
		} catch {
			return undefined;
		}
	}

	/**
	 * Discover all workspace packages and their current versions.
	 *
	 * @param cwd - Project root directory
	 * @returns Array of workspace packages with versions
	 */
	static discoverVersions(cwd: string): WorkspaceVersion[] {
		const resolvedCwd = resolve(cwd);
		const results: WorkspaceVersion[] = [];
		const seen = new Set<string>();

		// Discover workspace packages
		try {
			const workspaces: WorkspaceInfos = getWorkspaceInfos(resolvedCwd) ?? [];
			for (const ws of workspaces) {
				if (seen.has(ws.path)) continue;
				seen.add(ws.path);

				const version = readPackageVersion(ws.path);
				if (version) {
					results.push({ name: ws.name, path: ws.path, version });
				}
			}
		} catch {
			// workspace-tools failed — fall through to root check
		}

		// Always include root if not already present
		if (!seen.has(resolvedCwd)) {
			const version = readPackageVersion(resolvedCwd);
			if (version) {
				let rootName = "root";
				try {
					const pkg = JSON.parse(readFileSync(join(resolvedCwd, "package.json"), "utf-8")) as {
						name?: string;
					};
					if (pkg.name) rootName = pkg.name;
				} catch {
					// Use default name
				}
				results.push({ name: rootName, path: resolvedCwd, version });
			}
		}

		return results;
	}

	/**
	 * Determine which workspace version applies to a given file path
	 * using longest-prefix matching.
	 *
	 * @param filePath - Absolute path to the file
	 * @param workspaces - Discovered workspace versions
	 * @param rootVersion - Fallback version from project root
	 * @returns The version string to use
	 */
	static resolveVersion(filePath: string, workspaces: WorkspaceVersion[], rootVersion: string): string {
		const resolved = resolve(filePath);
		let bestMatch: WorkspaceVersion | undefined;
		let bestLength = 0;

		for (const ws of workspaces) {
			const rel = relative(ws.path, resolved);
			// File is inside this workspace if the relative path doesn't start with ".."
			if (!rel.startsWith("..") && ws.path.length > bestLength) {
				bestMatch = ws;
				bestLength = ws.path.length;
			}
		}

		return bestMatch?.version ?? rootVersion;
	}

	/**
	 * Resolve glob patterns to absolute file paths.
	 *
	 * @param configs - Version file configurations
	 * @param cwd - Project root directory
	 * @returns Array of `[filePath, config]` tuples
	 */
	static resolveGlobs(configs: readonly VersionFileConfig[], cwd: string): Array<[string, VersionFileConfig]> {
		const results: Array<[string, VersionFileConfig]> = [];
		const resolvedCwd = resolve(cwd);

		for (const config of configs) {
			const matches = globSync(config.glob, {
				cwd: resolvedCwd,
				exclude: (f) => f.includes("node_modules"),
			});

			for (const match of matches) {
				results.push([join(resolvedCwd, match), config]);
			}
		}

		return results;
	}

	/**
	 * Detect indentation from file content.
	 *
	 * @param content - Raw file content
	 * @returns Detected indent string (defaults to 2 spaces)
	 */
	static detectIndent(content: string): string {
		const match = content.match(/^(\s+)"/m);
		return match?.[1] ?? "  ";
	}

	/**
	 * Update JSON file at specified JSONPath locations.
	 *
	 * Preserves formatting (indent style and trailing newline).
	 *
	 * @param filePath - Absolute path to the JSON file
	 * @param jsonPaths - JSONPath expressions to update
	 * @param version - New version string
	 * @returns Update result, or `undefined` if no changes were made
	 */
	static updateFile(filePath: string, jsonPaths: readonly string[], version: string): VersionFileUpdate | undefined {
		const content = readFileSync(filePath, "utf-8");
		const indent = VersionFiles.detectIndent(content);
		const trailingNewline = content.endsWith("\n");
		const obj = JSON.parse(content) as unknown;

		const previousValues = jsonPaths.flatMap((jp) => jsonPathGet(obj, jp));
		let totalUpdated = 0;

		for (const jp of jsonPaths) {
			totalUpdated += jsonPathSet(obj, jp, version);
		}

		if (totalUpdated === 0) {
			return undefined;
		}

		let output = JSON.stringify(obj, null, indent);
		if (trailingNewline) {
			output += "\n";
		}

		writeFileSync(filePath, output, "utf-8");

		return {
			filePath,
			jsonPaths,
			version,
			previousValues,
		};
	}

	/**
	 * Orchestrate the full version file update flow.
	 *
	 * @param cwd - Project root directory
	 * @param configs - Validated version file configurations
	 * @param dryRun - If true, do not write files
	 * @returns Array of update results
	 */
	static processVersionFiles(cwd: string, configs: readonly VersionFileConfig[], dryRun = false): VersionFileUpdate[] {
		const workspaces = VersionFiles.discoverVersions(cwd);
		const rootVersion = workspaces.find((ws) => ws.path === resolve(cwd))?.version ?? "0.0.0";
		const resolved = VersionFiles.resolveGlobs(configs, cwd);
		const updates: VersionFileUpdate[] = [];

		for (const [filePath, config] of resolved) {
			const jsonPaths = config.paths ?? ["$.version"];
			const version = VersionFiles.resolveVersion(filePath, workspaces, rootVersion);

			if (dryRun) {
				const content = readFileSync(filePath, "utf-8");
				const obj = JSON.parse(content) as unknown;
				const previousValues = jsonPaths.flatMap((jp) => jsonPathGet(obj, jp));
				updates.push({ filePath, jsonPaths, version, previousValues });
			} else {
				const result = VersionFiles.updateFile(filePath, jsonPaths, version);
				if (result) {
					updates.push(result);
				}
			}
		}

		return updates;
	}
}

/** Read the `version` field from a package.json in the given directory. */
function readPackageVersion(dir: string): string | undefined {
	try {
		const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8")) as {
			version?: string;
		};
		return pkg.version;
	} catch {
		return undefined;
	}
}

/** Strip JSONC comments (line and block) from a string. */
function stripJsoncComments(input: string): string {
	return input.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
}
