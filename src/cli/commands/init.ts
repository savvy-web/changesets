/**
 * Init command — bootstrap a repo for \@savvy-web/changesets.
 *
 * Creates the `.changeset/` directory, writes (or patches) `config.json`,
 * and configures markdownlint rules scoped to changeset files.
 *
 * @internal
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Command, Options } from "@effect/cli";
import { Data, Effect } from "effect";
import { findProjectRoot } from "workspace-tools";

const CUSTOM_RULES_ENTRY = "@savvy-web/changesets/markdownlint";
const CHANGELOG_ENTRY = "@savvy-web/changesets/changelog";

const MARKDOWNLINT_CONFIG_PATHS = [
	"lib/configs/.markdownlint-cli2.jsonc",
	"lib/configs/.markdownlint-cli2.json",
	".markdownlint-cli2.jsonc",
	".markdownlint-cli2.json",
] as const;

const RULE_NAMES = [
	"changeset-heading-hierarchy",
	"changeset-required-sections",
	"changeset-content-structure",
	"changeset-uncategorized-content",
] as const;

const DEFAULT_CONFIG = {
	$schema: "https://unpkg.com/@changesets/config@3.1.1/schema.json",
	changelog: [CHANGELOG_ENTRY, { repo: "owner/repo" }],
	commit: false,
	access: "restricted",
	baseBranch: "main",
	updateInternalDependencies: "patch",
	ignore: [],
	privatePackages: { tag: true, version: true },
} as const;

/** @internal */
export const InitErrorBase = Data.TaggedError("InitError");

/** Error during init command execution. */
export class InitError extends InitErrorBase<{
	readonly step: string;
	readonly reason: string;
}> {
	get message() {
		return `Init failed at ${this.step}: ${this.reason}`;
	}
}

/* v8 ignore start -- CLI option definitions; handler functions tested individually */
const forceOption = Options.boolean("force").pipe(
	Options.withAlias("f"),
	Options.withDescription("Overwrite existing config files"),
	Options.withDefault(false),
);

const quietOption = Options.boolean("quiet").pipe(
	Options.withAlias("q"),
	Options.withDescription("Silence warnings, always exit 0"),
	Options.withDefault(false),
);

const markdownlintOption = Options.boolean("markdownlint").pipe(
	Options.withDescription("Register rules in base markdownlint config"),
	Options.withDefault(true),
);

const checkOption = Options.boolean("check").pipe(
	Options.withDescription("Check configuration without writing (for postinstall scripts)"),
	Options.withDefault(false),
);
/* v8 ignore stop */

/**
 * Detect `owner/repo` from the git remote origin URL.
 * Returns `null` when detection fails.
 */
export function detectGitHubRepo(cwd: string): string | null {
	try {
		const url = execSync("git remote get-url origin", { cwd, encoding: "utf-8" }).trim();
		const https = url.match(/github\.com\/([^/]+)\/([^/.]+)/);
		if (https) return `${https[1]}/${https[2]}`;
		const ssh = url.match(/github\.com:([^/]+)\/([^/.]+)/);
		if (ssh) return `${ssh[1]}/${ssh[2]}`;
	} catch {
		// git not available or no remote
	}
	return null;
}

/** Strip single-line `//` and multi-line JSONC comments for parsing. */
export function stripJsoncComments(text: string): string {
	return text.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Resolve workspace root from cwd, falling back to cwd itself. */
export function resolveWorkspaceRoot(cwd: string): string {
	return findProjectRoot(cwd) ?? cwd;
}

/** Find the first existing markdownlint config file from candidate paths. */
export function findMarkdownlintConfig(root: string): string | null {
	for (const configPath of MARKDOWNLINT_CONFIG_PATHS) {
		if (existsSync(join(root, configPath))) return configPath;
	}
	return null;
}

/** @internal */
export function ensureChangesetDir(root: string): Effect.Effect<string, InitError> {
	return Effect.try({
		try: () => {
			const dir = join(root, ".changeset");
			mkdirSync(dir, { recursive: true });
			return dir;
		},
		catch: (error) =>
			new InitError({
				step: ".changeset directory",
				reason: error instanceof Error ? error.message : String(error),
			}),
	});
}

/** @internal */
export function handleConfig(changesetDir: string, repoSlug: string, force: boolean): Effect.Effect<string, InitError> {
	return Effect.try({
		try: () => {
			const configPath = join(changesetDir, "config.json");
			if (force || !existsSync(configPath)) {
				const config = {
					...DEFAULT_CONFIG,
					changelog: [CHANGELOG_ENTRY, { repo: repoSlug }],
				};
				writeFileSync(configPath, `${JSON.stringify(config, null, "\t")}\n`);
				return force ? "Overwrote .changeset/config.json" : "Created .changeset/config.json";
			}
			const existing = JSON.parse(readFileSync(configPath, "utf-8"));
			existing.changelog = [CHANGELOG_ENTRY, { repo: repoSlug }];
			writeFileSync(configPath, `${JSON.stringify(existing, null, "\t")}\n`);
			return "Patched changelog in .changeset/config.json";
		},
		catch: (error) =>
			new InitError({
				step: ".changeset/config.json",
				reason: error instanceof Error ? error.message : String(error),
			}),
	});
}

/** @internal */
export function handleBaseMarkdownlint(root: string): Effect.Effect<string, InitError> {
	return Effect.try({
		try: () => {
			const foundPath = findMarkdownlintConfig(root);
			if (!foundPath) {
				return `Warning: no markdownlint config found (checked ${MARKDOWNLINT_CONFIG_PATHS.join(", ")})`;
			}

			const fullPath = join(root, foundPath);
			const raw = readFileSync(fullPath, "utf-8");
			const parsed = JSON.parse(stripJsoncComments(raw));

			if (!Array.isArray(parsed.customRules)) {
				parsed.customRules = [];
			}
			if (!parsed.customRules.includes(CUSTOM_RULES_ENTRY)) {
				parsed.customRules.push(CUSTOM_RULES_ENTRY);
			}

			if (typeof parsed.config !== "object" || parsed.config === null) {
				parsed.config = {};
			}
			for (const rule of RULE_NAMES) {
				if (!(rule in parsed.config)) {
					parsed.config[rule] = false;
				}
			}

			writeFileSync(fullPath, `${JSON.stringify(parsed, null, "\t")}\n`);
			return `Updated ${foundPath}`;
		},
		catch: (error) =>
			new InitError({
				step: "markdownlint config",
				reason: error instanceof Error ? error.message : String(error),
			}),
	});
}

/** @internal */
export function handleChangesetMarkdownlint(
	changesetDir: string,
	root: string,
	force: boolean,
): Effect.Effect<string, InitError> {
	return Effect.try({
		try: () => {
			const mdlintPath = join(changesetDir, ".markdownlint.json");
			const baseConfig = findMarkdownlintConfig(root);

			if (force || !existsSync(mdlintPath)) {
				const mdlintConfig: Record<string, unknown> = {};
				if (baseConfig) {
					mdlintConfig.extends = `../${baseConfig}`;
				}
				mdlintConfig.default = false;
				mdlintConfig.MD041 = false;
				for (const rule of RULE_NAMES) {
					mdlintConfig[rule] = true;
				}
				writeFileSync(mdlintPath, `${JSON.stringify(mdlintConfig, null, "\t")}\n`);
				return force ? "Overwrote .changeset/.markdownlint.json" : "Created .changeset/.markdownlint.json";
			}

			const existing = JSON.parse(readFileSync(mdlintPath, "utf-8"));
			for (const rule of RULE_NAMES) {
				existing[rule] = true;
			}
			writeFileSync(mdlintPath, `${JSON.stringify(existing, null, "\t")}\n`);
			return "Patched rules in .changeset/.markdownlint.json";
		},
		catch: (error) =>
			new InitError({
				step: ".changeset/.markdownlint.json",
				reason: error instanceof Error ? error.message : String(error),
			}),
	});
}

// ---------------------------------------------------------------------------
// Check functions (--check mode)
// ---------------------------------------------------------------------------

/** Diagnostic from a --check run. */
export interface CheckIssue {
	readonly file: string;
	readonly message: string;
}

/** Check that .changeset/ directory exists. */
export function checkChangesetDir(root: string): CheckIssue[] {
	const dir = join(root, ".changeset");
	if (!existsSync(dir)) {
		return [{ file: ".changeset/", message: "directory does not exist" }];
	}
	return [];
}

/** Check that .changeset/config.json exists and has the correct changelog entry. */
export function checkConfig(changesetDir: string, repoSlug: string): CheckIssue[] {
	const configPath = join(changesetDir, "config.json");
	if (!existsSync(configPath)) {
		return [{ file: ".changeset/config.json", message: "file does not exist" }];
	}
	try {
		const config = JSON.parse(readFileSync(configPath, "utf-8"));
		const issues: CheckIssue[] = [];
		const changelog = config.changelog;
		const entry = Array.isArray(changelog) ? changelog[0] : changelog;
		const repo = Array.isArray(changelog) ? changelog[1]?.repo : undefined;

		if (entry !== CHANGELOG_ENTRY) {
			issues.push({
				file: ".changeset/config.json",
				message: `changelog formatter is "${entry}", expected "${CHANGELOG_ENTRY}"`,
			});
		} else if (repo !== repoSlug) {
			issues.push({
				file: ".changeset/config.json",
				message: `changelog repo is "${repo ?? "(not set)"}", expected "${repoSlug}"`,
			});
		}

		return issues;
	} catch {
		return [{ file: ".changeset/config.json", message: "could not parse file" }];
	}
}

/** Check that base markdownlint config has our customRules and rule entries. */
export function checkBaseMarkdownlint(root: string): CheckIssue[] {
	const foundPath = findMarkdownlintConfig(root);
	if (!foundPath) {
		return [{ file: "markdownlint config", message: `not found (checked ${MARKDOWNLINT_CONFIG_PATHS.join(", ")})` }];
	}

	try {
		const raw = readFileSync(join(root, foundPath), "utf-8");
		const parsed = JSON.parse(stripJsoncComments(raw));
		const issues: CheckIssue[] = [];

		if (!Array.isArray(parsed.customRules) || !parsed.customRules.includes(CUSTOM_RULES_ENTRY)) {
			issues.push({
				file: foundPath,
				message: `customRules does not include ${CUSTOM_RULES_ENTRY}`,
			});
		}

		const config = parsed.config;
		if (typeof config !== "object" || config === null) {
			issues.push({
				file: foundPath,
				message: "config section is missing",
			});
		} else {
			for (const rule of RULE_NAMES) {
				if (!(rule in config)) {
					issues.push({
						file: foundPath,
						message: `rule "${rule}" is not configured`,
					});
				}
			}
		}

		return issues;
	} catch {
		return [{ file: foundPath, message: "could not parse file" }];
	}
}

/** Check that .changeset/.markdownlint.json exists and has our rules enabled. */
export function checkChangesetMarkdownlint(changesetDir: string): CheckIssue[] {
	const mdlintPath = join(changesetDir, ".markdownlint.json");
	if (!existsSync(mdlintPath)) {
		return [{ file: ".changeset/.markdownlint.json", message: "file does not exist" }];
	}
	try {
		const existing = JSON.parse(readFileSync(mdlintPath, "utf-8"));
		const issues: CheckIssue[] = [];
		for (const rule of RULE_NAMES) {
			if (existing[rule] !== true) {
				issues.push({
					file: ".changeset/.markdownlint.json",
					message: `rule "${rule}" is not enabled`,
				});
			}
		}
		return issues;
	} catch {
		return [{ file: ".changeset/.markdownlint.json", message: "could not parse file" }];
	}
}

/* v8 ignore start -- CLI orchestration; individual functions tested separately */
export const initCommand = Command.make(
	"init",
	{ force: forceOption, quiet: quietOption, markdownlint: markdownlintOption, check: checkOption },
	({ force, quiet, markdownlint, check }) =>
		Effect.gen(function* () {
			const root = resolveWorkspaceRoot(process.cwd());

			// 1. Detect GitHub repo
			const repo = detectGitHubRepo(root);
			if (!repo && !quiet) {
				yield* Effect.log("Warning: could not detect GitHub repo from git remote, using placeholder");
			}
			const repoSlug = repo ?? "owner/repo";

			// --check mode: inspect current state without writing
			if (check) {
				const changesetDir = join(root, ".changeset");
				const issues: CheckIssue[] = [
					...checkChangesetDir(root),
					...checkConfig(changesetDir, repoSlug),
					...(markdownlint ? checkBaseMarkdownlint(root) : []),
					...checkChangesetMarkdownlint(changesetDir),
				];

				if (issues.length === 0) {
					yield* Effect.log("All @savvy-web/changesets config files are up to date.");
					return;
				}

				for (const issue of issues) {
					yield* Effect.logWarning(`${issue.file}: ${issue.message}`);
				}
				yield* Effect.logWarning('Run "savvy-changesets init --force" to fix.');
				return;
			}

			// 2. Create .changeset/ directory
			const changesetDir = yield* ensureChangesetDir(root);
			yield* Effect.log("Ensured .changeset/ directory");

			// 3–5: Run each step, collecting errors
			const errors: InitError[] = [];

			// 3. Handle config.json
			const configResult = yield* handleConfig(changesetDir, repoSlug, force).pipe(Effect.either);
			if (configResult._tag === "Right") {
				yield* Effect.log(configResult.right);
			} else {
				errors.push(configResult.left);
			}

			// 4. Handle base markdownlint config
			if (markdownlint) {
				const baseResult = yield* handleBaseMarkdownlint(root).pipe(Effect.either);
				if (baseResult._tag === "Right") {
					yield* Effect.log(baseResult.right);
				} else {
					errors.push(baseResult.left);
				}
			}

			// 5. Handle .changeset/.markdownlint.json
			const mdlintResult = yield* handleChangesetMarkdownlint(changesetDir, root, force).pipe(Effect.either);
			if (mdlintResult._tag === "Right") {
				yield* Effect.log(mdlintResult.right);
			} else {
				errors.push(mdlintResult.left);
			}

			// Report collected errors
			if (errors.length > 0) {
				for (const err of errors) {
					yield* Effect.logError(err.message);
				}
				if (!quiet) {
					process.exitCode = 1;
				}
				return;
			}

			yield* Effect.log("Init complete.");
		}).pipe(
			Effect.catchAll((error) =>
				Effect.gen(function* () {
					if (!quiet) {
						yield* Effect.logError(error instanceof InitError ? error.message : `Init failed: ${String(error)}`);
						process.exitCode = 1;
					}
				}),
			),
		),
).pipe(Command.withDescription("Bootstrap a repo for @savvy-web/changesets"));
/* v8 ignore stop */
