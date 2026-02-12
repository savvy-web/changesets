import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InitError, detectGitHubRepo, resolveWorkspaceRoot, stripJsoncComments } from "./init.js";

vi.mock("node:child_process", () => ({
	execSync: vi.fn(),
}));

vi.mock("node:fs", async () => {
	const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
	return {
		...actual,
		existsSync: vi.fn(),
		mkdirSync: vi.fn(),
		readFileSync: vi.fn(),
		writeFileSync: vi.fn(),
	};
});

vi.mock("workspace-tools", () => ({
	findProjectRoot: vi.fn(),
}));

afterEach(() => {
	vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// detectGitHubRepo
// ---------------------------------------------------------------------------
describe("detectGitHubRepo", () => {
	it("parses HTTPS remote URL", () => {
		vi.mocked(execSync).mockReturnValue("https://github.com/savvy-web/changesets.git\n");
		expect(detectGitHubRepo("/project")).toBe("savvy-web/changesets");
	});

	it("parses SSH remote URL", () => {
		vi.mocked(execSync).mockReturnValue("git@github.com:savvy-web/changesets.git\n");
		expect(detectGitHubRepo("/project")).toBe("savvy-web/changesets");
	});

	it("parses HTTPS URL without .git suffix", () => {
		vi.mocked(execSync).mockReturnValue("https://github.com/owner/repo\n");
		expect(detectGitHubRepo("/project")).toBe("owner/repo");
	});

	it("returns null when git command fails", () => {
		vi.mocked(execSync).mockImplementation(() => {
			throw new Error("not a git repo");
		});
		expect(detectGitHubRepo("/project")).toBeNull();
	});

	it("returns null for non-GitHub remote", () => {
		vi.mocked(execSync).mockReturnValue("https://gitlab.com/owner/repo.git\n");
		expect(detectGitHubRepo("/project")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// stripJsoncComments
// ---------------------------------------------------------------------------
describe("stripJsoncComments", () => {
	it("strips single-line comments", () => {
		const input = '{\n  // comment\n  "key": "value"\n}';
		expect(JSON.parse(stripJsoncComments(input))).toEqual({ key: "value" });
	});

	it("strips multi-line comments", () => {
		const input = '{\n  /* block\n  comment */\n  "key": "value"\n}';
		expect(JSON.parse(stripJsoncComments(input))).toEqual({ key: "value" });
	});

	it("handles no comments", () => {
		const input = '{ "key": "value" }';
		expect(JSON.parse(stripJsoncComments(input))).toEqual({ key: "value" });
	});
});

// ---------------------------------------------------------------------------
// resolveWorkspaceRoot
// ---------------------------------------------------------------------------
describe("resolveWorkspaceRoot", () => {
	it("returns project root from workspace-tools", async () => {
		const { findProjectRoot } = await import("workspace-tools");
		vi.mocked(findProjectRoot).mockReturnValue("/monorepo/root");
		expect(resolveWorkspaceRoot("/monorepo/root/packages/foo")).toBe("/monorepo/root");
	});

	it("falls back to cwd when findProjectRoot returns null", async () => {
		const { findProjectRoot } = await import("workspace-tools");
		vi.mocked(findProjectRoot).mockReturnValue(undefined as unknown as string);
		expect(resolveWorkspaceRoot("/standalone/project")).toBe("/standalone/project");
	});
});

// ---------------------------------------------------------------------------
// InitError
// ---------------------------------------------------------------------------
describe("InitError", () => {
	it("is a tagged error with step and reason", () => {
		const error = new InitError({ step: "config.json", reason: "EACCES" });
		expect(error._tag).toBe("InitError");
		expect(error.step).toBe("config.json");
		expect(error.reason).toBe("EACCES");
		expect(error.message).toBe("Init failed at config.json: EACCES");
	});
});

// ---------------------------------------------------------------------------
// Init command logic (unit-tested via helpers and fs mocks)
// ---------------------------------------------------------------------------

/** Safely get a written file's content, throwing a clear error if missing. */
function getWritten(written: Map<string, string>, path: string): string {
	const content = written.get(path);
	if (content === undefined) throw new Error(`Expected file to be written: ${path}`);
	return content;
}

/** Helper to simulate the init command logic without Effect runtime. */
function runInit(opts: {
	cwd: string;
	force?: boolean;
	quiet?: boolean;
	markdownlint?: boolean;
	repo?: string | null;
	existingFiles?: Record<string, string>;
}) {
	const { cwd, force = false, markdownlint = true, repo = "owner/repo" } = opts;
	const existingFiles = opts.existingFiles ?? {};
	const written = new Map<string, string>();

	vi.mocked(existsSync).mockImplementation((p) => String(p) in existingFiles);
	vi.mocked(readFileSync).mockImplementation((p) => {
		const content = existingFiles[String(p)];
		if (content === undefined) throw new Error(`ENOENT: ${String(p)}`);
		return content;
	});
	vi.mocked(writeFileSync).mockImplementation((p, data) => {
		written.set(String(p), String(data));
	});

	const repoSlug = repo ?? "owner/repo";
	const changesetDir = join(cwd, ".changeset");
	const configPath = join(changesetDir, "config.json");
	const baseConfigPath = join(cwd, "lib/configs/.markdownlint-cli2.jsonc");
	const mdlintPath = join(changesetDir, ".markdownlint.json");

	// mkdir
	mkdirSync(changesetDir, { recursive: true });

	// config.json
	if (force || !existsSync(configPath)) {
		const config = {
			$schema: "https://unpkg.com/@changesets/config@3.1.1/schema.json",
			changelog: ["@savvy-web/changesets/changelog", { repo: repoSlug }],
			commit: false,
			access: "restricted",
			baseBranch: "main",
			updateInternalDependencies: "patch",
			ignore: [],
			privatePackages: { tag: true, version: true },
		};
		writeFileSync(configPath, `${JSON.stringify(config, null, "\t")}\n`);
	} else {
		const existing = JSON.parse(readFileSync(configPath, "utf-8") as string);
		existing.changelog = ["@savvy-web/changesets/changelog", { repo: repoSlug }];
		writeFileSync(configPath, `${JSON.stringify(existing, null, "\t")}\n`);
	}

	// base markdownlint config
	if (markdownlint && existsSync(baseConfigPath)) {
		const raw = readFileSync(baseConfigPath, "utf-8") as string;
		const parsed = JSON.parse(stripJsoncComments(raw));
		if (!Array.isArray(parsed.customRules)) parsed.customRules = [];
		if (!parsed.customRules.includes("@savvy-web/changesets/markdownlint")) {
			parsed.customRules.push("@savvy-web/changesets/markdownlint");
		}
		if (typeof parsed.config !== "object" || parsed.config === null) parsed.config = {};
		for (const rule of ["changeset-heading-hierarchy", "changeset-required-sections", "changeset-content-structure"]) {
			if (!(rule in parsed.config)) parsed.config[rule] = false;
		}
		writeFileSync(baseConfigPath, `${JSON.stringify(parsed, null, "\t")}\n`);
	}

	// .markdownlint.json
	const hasBaseConfig = existsSync(baseConfigPath);
	if (force || !existsSync(mdlintPath)) {
		const mdlintConfig: Record<string, unknown> = {};
		if (hasBaseConfig) mdlintConfig.extends = "../lib/configs/.markdownlint-cli2.jsonc";
		mdlintConfig.default = false;
		mdlintConfig.MD041 = false;
		for (const rule of ["changeset-heading-hierarchy", "changeset-required-sections", "changeset-content-structure"]) {
			mdlintConfig[rule] = true;
		}
		writeFileSync(mdlintPath, `${JSON.stringify(mdlintConfig, null, "\t")}\n`);
	} else {
		const existing = JSON.parse(readFileSync(mdlintPath, "utf-8") as string);
		for (const rule of ["changeset-heading-hierarchy", "changeset-required-sections", "changeset-content-structure"]) {
			existing[rule] = true;
		}
		writeFileSync(mdlintPath, `${JSON.stringify(existing, null, "\t")}\n`);
	}

	return written;
}

describe("init command", () => {
	const cwd = "/project";

	it("creates .changeset/ directory", () => {
		runInit({ cwd });
		expect(mkdirSync).toHaveBeenCalledWith(join(cwd, ".changeset"), { recursive: true });
	});

	it("writes full config.json when missing", () => {
		const written = runInit({ cwd, repo: "savvy-web/changesets" });
		const config = JSON.parse(getWritten(written, join(cwd, ".changeset/config.json")));
		expect(config.$schema).toContain("@changesets/config");
		expect(config.changelog).toEqual(["@savvy-web/changesets/changelog", { repo: "savvy-web/changesets" }]);
		expect(config.commit).toBe(false);
		expect(config.access).toBe("restricted");
	});

	it("writes full .markdownlint.json when missing (no base config)", () => {
		const written = runInit({ cwd });
		const mdlint = JSON.parse(getWritten(written, join(cwd, ".changeset/.markdownlint.json")));
		expect(mdlint.extends).toBeUndefined();
		expect(mdlint.default).toBe(false);
		expect(mdlint.MD041).toBe(false);
		expect(mdlint["changeset-heading-hierarchy"]).toBe(true);
		expect(mdlint["changeset-required-sections"]).toBe(true);
		expect(mdlint["changeset-content-structure"]).toBe(true);
	});

	it("includes extends in .markdownlint.json when base config exists", () => {
		const written = runInit({
			cwd,
			existingFiles: {
				[join(cwd, "lib/configs/.markdownlint-cli2.jsonc")]: JSON.stringify({
					customRules: [],
					config: {},
				}),
			},
		});
		const mdlint = JSON.parse(getWritten(written, join(cwd, ".changeset/.markdownlint.json")));
		expect(mdlint.extends).toBe("../lib/configs/.markdownlint-cli2.jsonc");
	});

	it("patches only changelog key in existing config.json", () => {
		const existing = {
			$schema: "https://unpkg.com/@changesets/config@3.1.1/schema.json",
			changelog: "@changesets/cli/changelog",
			commit: true,
			access: "public",
			baseBranch: "develop",
		};
		const written = runInit({
			cwd,
			repo: "org/repo",
			existingFiles: {
				[join(cwd, ".changeset/config.json")]: JSON.stringify(existing),
			},
		});
		const config = JSON.parse(getWritten(written, join(cwd, ".changeset/config.json")));
		expect(config.changelog).toEqual(["@savvy-web/changesets/changelog", { repo: "org/repo" }]);
		// Preserved existing values
		expect(config.commit).toBe(true);
		expect(config.access).toBe("public");
		expect(config.baseBranch).toBe("develop");
	});

	it("merges only 3 rule keys in existing .markdownlint.json", () => {
		const existing = {
			extends: "../some/other/config.json",
			default: true,
			MD041: true,
			"some-other-rule": true,
		};
		const written = runInit({
			cwd,
			existingFiles: {
				[join(cwd, ".changeset/.markdownlint.json")]: JSON.stringify(existing),
			},
		});
		const mdlint = JSON.parse(getWritten(written, join(cwd, ".changeset/.markdownlint.json")));
		// Preserved existing values
		expect(mdlint.extends).toBe("../some/other/config.json");
		expect(mdlint.default).toBe(true);
		expect(mdlint.MD041).toBe(true);
		expect(mdlint["some-other-rule"]).toBe(true);
		// Merged our rules
		expect(mdlint["changeset-heading-hierarchy"]).toBe(true);
		expect(mdlint["changeset-required-sections"]).toBe(true);
		expect(mdlint["changeset-content-structure"]).toBe(true);
	});

	it("inserts customRules and disabled rules into base markdownlint config", () => {
		const baseConfig = {
			customRules: ["some-other-plugin"],
			config: { default: true },
		};
		const written = runInit({
			cwd,
			existingFiles: {
				[join(cwd, "lib/configs/.markdownlint-cli2.jsonc")]: JSON.stringify(baseConfig),
			},
		});
		const parsed = JSON.parse(getWritten(written, join(cwd, "lib/configs/.markdownlint-cli2.jsonc")));
		expect(parsed.customRules).toContain("some-other-plugin");
		expect(parsed.customRules).toContain("@savvy-web/changesets/markdownlint");
		expect(parsed.config["changeset-heading-hierarchy"]).toBe(false);
		expect(parsed.config["changeset-required-sections"]).toBe(false);
		expect(parsed.config["changeset-content-structure"]).toBe(false);
		// Preserved existing config
		expect(parsed.config.default).toBe(true);
	});

	it("skips base config when file does not exist", () => {
		const written = runInit({ cwd });
		expect(written.has(join(cwd, "lib/configs/.markdownlint-cli2.jsonc"))).toBe(false);
	});

	it("does not duplicate customRules entry", () => {
		const baseConfig = {
			customRules: ["@savvy-web/changesets/markdownlint"],
			config: {
				"changeset-heading-hierarchy": false,
				"changeset-required-sections": false,
				"changeset-content-structure": false,
			},
		};
		const written = runInit({
			cwd,
			existingFiles: {
				[join(cwd, "lib/configs/.markdownlint-cli2.jsonc")]: JSON.stringify(baseConfig),
			},
		});
		const parsed = JSON.parse(getWritten(written, join(cwd, "lib/configs/.markdownlint-cli2.jsonc")));
		const count = parsed.customRules.filter((r: string) => r === "@savvy-web/changesets/markdownlint").length;
		expect(count).toBe(1);
	});

	it("does not overwrite existing rule values in base config", () => {
		const baseConfig = {
			customRules: [],
			config: {
				"changeset-heading-hierarchy": true,
			},
		};
		const written = runInit({
			cwd,
			existingFiles: {
				[join(cwd, "lib/configs/.markdownlint-cli2.jsonc")]: JSON.stringify(baseConfig),
			},
		});
		const parsed = JSON.parse(getWritten(written, join(cwd, "lib/configs/.markdownlint-cli2.jsonc")));
		// Should not overwrite the existing true value
		expect(parsed.config["changeset-heading-hierarchy"]).toBe(true);
		// Should add missing rules
		expect(parsed.config["changeset-required-sections"]).toBe(false);
		expect(parsed.config["changeset-content-structure"]).toBe(false);
	});

	it("--force overwrites .changeset/config.json even when it exists", () => {
		const existing = {
			changelog: "@changesets/cli/changelog",
			commit: true,
			baseBranch: "develop",
		};
		const written = runInit({
			cwd,
			force: true,
			repo: "org/repo",
			existingFiles: {
				[join(cwd, ".changeset/config.json")]: JSON.stringify(existing),
			},
		});
		const config = JSON.parse(getWritten(written, join(cwd, ".changeset/config.json")));
		// Force writes full defaults — existing commit/baseBranch are replaced
		expect(config.commit).toBe(false);
		expect(config.baseBranch).toBe("main");
		expect(config.changelog).toEqual(["@savvy-web/changesets/changelog", { repo: "org/repo" }]);
	});

	it("--force overwrites .changeset/.markdownlint.json even when it exists", () => {
		const existing = {
			extends: "../some/other/config.json",
			default: true,
			"some-other-rule": true,
		};
		const written = runInit({
			cwd,
			force: true,
			existingFiles: {
				[join(cwd, ".changeset/.markdownlint.json")]: JSON.stringify(existing),
			},
		});
		const mdlint = JSON.parse(getWritten(written, join(cwd, ".changeset/.markdownlint.json")));
		// Force writes full defaults — existing values are replaced
		expect(mdlint.default).toBe(false);
		expect(mdlint["some-other-rule"]).toBeUndefined();
		// No extends since base config doesn't exist
		expect(mdlint.extends).toBeUndefined();
	});

	it("uses placeholder repo when detection fails", () => {
		const written = runInit({ cwd, repo: null });
		const config = JSON.parse(getWritten(written, join(cwd, ".changeset/config.json")));
		expect(config.changelog[1].repo).toBe("owner/repo");
	});

	it("skips base config when --markdownlint=false", () => {
		const baseConfig = { customRules: [], config: {} };
		const written = runInit({
			cwd,
			markdownlint: false,
			existingFiles: {
				[join(cwd, "lib/configs/.markdownlint-cli2.jsonc")]: JSON.stringify(baseConfig),
			},
		});
		// Base config should not be written
		expect(written.has(join(cwd, "lib/configs/.markdownlint-cli2.jsonc"))).toBe(false);
		// But .changeset/.markdownlint.json should still be created
		expect(written.has(join(cwd, ".changeset/.markdownlint.json"))).toBe(true);
	});

	it("handles JSONC comments in base config", () => {
		const jsonc = `{
	// Custom rules
	"customRules": [],
	/* Config block */
	"config": { "default": true }
}`;
		const written = runInit({
			cwd,
			existingFiles: {
				[join(cwd, "lib/configs/.markdownlint-cli2.jsonc")]: jsonc,
			},
		});
		const parsed = JSON.parse(getWritten(written, join(cwd, "lib/configs/.markdownlint-cli2.jsonc")));
		expect(parsed.customRules).toContain("@savvy-web/changesets/markdownlint");
		expect(parsed.config.default).toBe(true);
	});
});
