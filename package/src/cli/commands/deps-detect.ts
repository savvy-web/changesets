/**
 * `deps detect` command — read-only dependency-diff inspection.
 *
 * @remarks
 * Computes the per-workspace-package dependency changes between two git
 * refs and renders them either as structured JSON (one row per change)
 * or as ready-to-paste CSH005 markdown. No file writes.
 *
 * Defaults:
 * - `--from` → `git merge-base <baseBranch> HEAD`
 * - `--to`   → working tree (i.e., `HEAD` plus staged + unstaged + untracked,
 *   matching `analyze-branch`'s coverage). Passed as the special value
 *   `WORKTREE` to {@link WorkspaceSnapshotReader} — implementations resolve
 *   this against the live working tree rather than `git show`.
 *
 * @example
 * ```bash
 * savvy-changesets deps detect
 * savvy-changesets deps detect --from HEAD~5 --to HEAD --json
 * savvy-changesets deps detect --package @scope/foo --markdown
 * ```
 *
 * @internal
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Command, Options } from "@effect/cli";
import { Effect, Option } from "effect";
import { WorkspaceDiscovery } from "workspaces-effect";

import { GitError } from "../../errors.js";
import { ConfigInspector } from "../../services/config-inspector.js";
import { listPublishablePackageNames } from "../../services/silk-publishability.js";
import type { WorkspaceSnapshot } from "../../services/workspace-snapshot.js";
import { WorkspaceSnapshotReader } from "../../services/workspace-snapshot.js";
import type { WorkspaceDependencyDiff } from "../../utils/dep-diff.js";
import { computeWorkspaceDependencyDiffs } from "../../utils/dep-diff.js";
import { serializeDependencyTableToMarkdown } from "../../utils/dependency-table.js";

/* v8 ignore start -- CLI option definitions */
const fromOption = Options.text("from").pipe(
	Options.withDescription("Older ref to diff from (defaults to merge-base with base branch)"),
	Options.optional,
);
const toOption = Options.text("to").pipe(
	Options.withDescription("Newer ref to diff to (defaults to working tree)"),
	Options.optional,
);
const cwdOption = Options.directory("cwd").pipe(
	Options.withDescription("Project root (defaults to the current working directory)"),
	Options.withDefault("."),
);
const packageOption = Options.text("package").pipe(
	Options.withDescription("Restrict output to a single workspace package"),
	Options.optional,
);
const jsonOption = Options.boolean("json").pipe(
	Options.withDescription("Emit JSON (default)"),
	Options.withDefault(false),
);
const markdownOption = Options.boolean("markdown").pipe(
	Options.withDescription("Emit one CSH005 markdown block per workspace package"),
	Options.withDefault(false),
);
/* v8 ignore stop */

/**
 * Run `git merge-base <base> HEAD`, returning the SHA. Errors propagate
 * as {@link GitError}.
 *
 * @internal
 */
function gitMergeBase(cwd: string, base: string): Effect.Effect<string, GitError> {
	return Effect.try({
		try: () =>
			execFileSync("git", ["merge-base", base, "HEAD"], {
				cwd,
				encoding: "utf8",
				stdio: ["ignore", "pipe", "pipe"],
			}).trim(),
		catch: (error) => {
			const stderr = (error as { stderr?: Buffer | string }).stderr;
			const text = typeof stderr === "string" ? stderr : (stderr?.toString() ?? "");
			return new GitError({
				command: `git merge-base ${base} HEAD`,
				cwd,
				reason: text.trim() || ((error as Error).message ?? String(error)),
			});
		},
	});
}

/**
 * Read a workspace package snapshot from the live working tree. This is
 * the `--to` side when not overridden: we want staged + unstaged
 * package.json edits in the diff.
 *
 * @internal
 */
function snapshotFromWorktree(cwd: string): ReadonlyArray<WorkspaceSnapshot> {
	const snapshots: WorkspaceSnapshot[] = [];
	const dirs = new Set<string>([cwd]);

	// Workspace globs from live pnpm-workspace.yaml. Fall back to root-only.
	try {
		const yamlPath = join(cwd, "pnpm-workspace.yaml");
		const yaml = readFileSync(yamlPath, "utf8");
		const lines = yaml.split(/\r?\n/);
		let inPackagesBlock = false;
		for (const line of lines) {
			if (/^\s*#/.test(line)) continue;
			if (/^\s*packages\s*:\s*$/.test(line)) {
				inPackagesBlock = true;
				continue;
			}
			if (inPackagesBlock) {
				const m = line.match(/^\s+-\s+["']?(.+?)["']?\s*$/);
				if (m) {
					const glob = (m[1] as string).replace(/\/\*\*$/, "");
					// Materialize against the filesystem using a small inline globber.
					if (glob.includes("*") || glob.includes("?")) {
						try {
							const prefix = glob.includes("/") ? glob.slice(0, glob.lastIndexOf("/") + 1) : "";
							const ls = execFileSync("ls", [join(cwd, prefix || ".")], { encoding: "utf8" })
								.split("\n")
								.filter((s) => s.length > 0);
							for (const entry of ls) {
								const candidate = prefix ? `${prefix}${entry}` : entry;
								const regex = new RegExp(
									`^${glob
										.replace(/[.+^${}()|[\]\\]/g, "\\$&")
										.replace(/\*/g, "[^/]*")
										.replace(/\?/g, "[^/]")}$`,
								);
								if (regex.test(candidate)) dirs.add(join(cwd, candidate));
							}
						} catch {
							// Skip globs that fail to materialize.
						}
					} else {
						dirs.add(join(cwd, glob));
					}
				} else if (line.length > 0 && !line.startsWith(" ") && !line.startsWith("\t")) {
					inPackagesBlock = false;
				}
			}
		}
	} catch {
		// No pnpm-workspace.yaml: just consider the root.
	}

	for (const dir of dirs) {
		try {
			const pkgJson = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as {
				name?: string;
				version?: string;
				dependencies?: Record<string, string>;
				devDependencies?: Record<string, string>;
				peerDependencies?: Record<string, string>;
				optionalDependencies?: Record<string, string>;
			};
			if (!pkgJson.name) continue;
			const rel = dir === cwd ? "." : dir.slice(cwd.length + 1);
			snapshots.push({
				name: pkgJson.name,
				relativePath: rel,
				version: pkgJson.version ?? "0.0.0",
				dependencies: pkgJson.dependencies ?? {},
				devDependencies: pkgJson.devDependencies ?? {},
				peerDependencies: pkgJson.peerDependencies ?? {},
				optionalDependencies: pkgJson.optionalDependencies ?? {},
			});
		} catch {
			// Missing package.json or parse error — skip.
		}
	}

	return snapshots;
}

/**
 * Render a per-workspace diff as markdown — one frontmatter+section block
 * per affected workspace package, suitable for pasting into individual
 * `.changeset/*.md` files.
 *
 * @internal
 */
export function renderMarkdownBlocks(diffs: ReadonlyArray<WorkspaceDependencyDiff>): string {
	const blocks: string[] = [];
	for (const diff of diffs) {
		const frontmatter = `---\n"${diff.package}": patch\n---`;
		const table = serializeDependencyTableToMarkdown([...diff.rows]);
		blocks.push(`${frontmatter}\n\n## Dependencies\n\n${table}\n`);
	}
	return blocks.join("\n");
}

/**
 * Handler exported for direct invocation in tests.
 *
 * @internal
 */
export function runDepsDetect(
	cwd: string,
	from: Option.Option<string>,
	to: Option.Option<string>,
	pkg: Option.Option<string>,
	json: boolean,
	markdown: boolean,
) {
	return Effect.gen(function* () {
		const reader = yield* WorkspaceSnapshotReader;
		const resolvedCwd = resolve(cwd);

		// Resolve `--from` (default: merge-base with config's baseBranch)
		let fromRef = Option.getOrUndefined(from);
		if (!fromRef) {
			const inspector = yield* ConfigInspector;
			const inspected = yield* inspector
				.inspect(resolvedCwd)
				.pipe(
					Effect.catchTag("ConfigurationError", () => Effect.succeed({ baseBranch: "main" } as { baseBranch: string })),
				);
			fromRef = yield* gitMergeBase(resolvedCwd, inspected.baseBranch).pipe(
				Effect.catchTag("GitError", (err) => {
					process.exitCode = 1;
					return Effect.fail(err);
				}),
			);
		}

		// Resolve --to (default: working tree)
		const toRef = Option.getOrUndefined(to);

		const beforeSnaps = yield* reader.snapshotAt(resolvedCwd, fromRef).pipe(
			Effect.catchTag("GitError", (err) => {
				process.exitCode = 1;
				return Effect.fail(err);
			}),
		);

		const afterSnaps = toRef
			? yield* reader.snapshotAt(resolvedCwd, toRef).pipe(
					Effect.catchTag("GitError", (err) => {
						process.exitCode = 1;
						return Effect.fail(err);
					}),
				)
			: snapshotFromWorktree(resolvedCwd);

		let diffs = computeWorkspaceDependencyDiffs(beforeSnaps, afterSnaps);
		const targetPkg = Option.getOrUndefined(pkg);
		if (targetPkg) {
			// Explicit --package overrides the publishability filter; users
			// asking for a specific package by name get an answer regardless.
			diffs = diffs.filter((d) => d.package === targetPkg);
		} else {
			// Default: filter out workspace packages that cannot publish.
			// Their dep changes never reach a release, so a changeset for
			// them would mislead anyone reading the CHANGELOG.
			const discovery = yield* WorkspaceDiscovery;
			const livePackages = yield* discovery.listPackages(resolvedCwd).pipe(Effect.catchAll(() => Effect.succeed([])));
			const publishable = yield* listPublishablePackageNames(livePackages);
			diffs = diffs.filter((d) => publishable.has(d.package));
		}

		// Default to JSON when neither flag is set.
		const emitMarkdown = markdown && !json;

		if (emitMarkdown) {
			yield* Effect.log(renderMarkdownBlocks(diffs));
			return;
		}

		yield* Effect.log(JSON.stringify(diffs, null, 2));
	});
}

/* v8 ignore next 7 */
export const depsDetectCommand = Command.make(
	"detect",
	{
		from: fromOption,
		to: toOption,
		cwd: cwdOption,
		package: packageOption,
		json: jsonOption,
		markdown: markdownOption,
	},
	({ from, to, cwd, package: pkg, json, markdown }) => runDepsDetect(cwd, from, to, pkg, json, markdown),
).pipe(Command.withDescription("Compute the dependency diff between two refs"));
