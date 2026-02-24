import { existsSync, globSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceInfos } from "workspace-tools";
import { getWorkspaceInfos } from "workspace-tools";

import { VersionFiles } from "./version-files.js";

vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
	globSync: vi.fn(),
	readFileSync: vi.fn(),
	writeFileSync: vi.fn(),
}));

vi.mock("workspace-tools", () => ({
	getWorkspaceInfos: vi.fn(),
}));

const createMockWorkspace = (name: string, path: string): WorkspaceInfos[number] =>
	({ name, path, packageJson: {} }) as WorkspaceInfos[number];

afterEach(() => {
	vi.resetAllMocks();
});

describe("VersionFiles.readConfig", () => {
	it("returns undefined when config file does not exist", () => {
		vi.mocked(existsSync).mockReturnValue(false);
		expect(VersionFiles.readConfig("/project")).toBeUndefined();
	});

	it("returns undefined when changelog is not a tuple", () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ changelog: "simple-string" }));
		expect(VersionFiles.readConfig("/project")).toBeUndefined();
	});

	it("returns undefined when options lack versionFiles", () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(
			JSON.stringify({
				changelog: ["@savvy-web/changesets/changelog", { repo: "owner/repo" }],
			}),
		);
		expect(VersionFiles.readConfig("/project")).toBeUndefined();
	});

	it("returns undefined for empty versionFiles array", () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(
			JSON.stringify({
				changelog: ["@savvy-web/changesets/changelog", { repo: "owner/repo", versionFiles: [] }],
			}),
		);
		expect(VersionFiles.readConfig("/project")).toBeUndefined();
	});

	it("parses valid versionFiles config", () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(
			JSON.stringify({
				changelog: [
					"@savvy-web/changesets/changelog",
					{
						repo: "owner/repo",
						versionFiles: [{ glob: "plugin.json", paths: ["$.version"] }, { glob: "**/manifest.json" }],
					},
				],
			}),
		);

		const result = VersionFiles.readConfig("/project");
		expect(result).toHaveLength(2);
		expect(result?.[0].glob).toBe("plugin.json");
		expect(result?.[0].paths).toEqual(["$.version"]);
		expect(result?.[1].glob).toBe("**/manifest.json");
		expect(result?.[1].paths).toBeUndefined();
	});

	it("returns undefined on malformed JSON", () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue("not valid json{{{");
		expect(VersionFiles.readConfig("/project")).toBeUndefined();
	});

	it("returns undefined when versionFiles fails schema validation", () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(
			JSON.stringify({
				changelog: [
					"@savvy-web/changesets/changelog",
					{
						repo: "owner/repo",
						versionFiles: [{ glob: "", paths: ["invalid-path"] }],
					},
				],
			}),
		);
		expect(VersionFiles.readConfig("/project")).toBeUndefined();
	});

	it("warns when versionFiles is present but invalid", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(
			JSON.stringify({
				changelog: [
					"@savvy-web/changesets/changelog",
					{
						repo: "owner/repo",
						versionFiles: [{ glob: "", paths: ["invalid-path"] }],
					},
				],
			}),
		);

		expect(VersionFiles.readConfig("/project")).toBeUndefined();
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("[changesets] Invalid versionFiles configuration"));
		warnSpy.mockRestore();
	});

	it("strips JSONC comments before parsing", () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(`{
			// This is a comment
			"changelog": ["@savvy-web/changesets/changelog", {
				"repo": "owner/repo",
				"versionFiles": [{ "glob": "plugin.json" }]
			}]
		}`);

		const result = VersionFiles.readConfig("/project");
		expect(result).toHaveLength(1);
	});
});

describe("VersionFiles.discoverVersions", () => {
	it("discovers workspace package versions", () => {
		vi.mocked(getWorkspaceInfos).mockReturnValue([
			createMockWorkspace("pkg-a", "/project/packages/a"),
			createMockWorkspace("pkg-b", "/project/packages/b"),
		]);
		vi.mocked(readFileSync).mockImplementation((p) => {
			const s = String(p);
			if (s.endsWith("packages/a/package.json")) return JSON.stringify({ version: "1.0.0" });
			if (s.endsWith("packages/b/package.json")) return JSON.stringify({ version: "2.0.0" });
			if (s === join(resolve("/project"), "package.json")) return JSON.stringify({ name: "root", version: "0.0.0" });
			throw new Error("ENOENT");
		});

		const result = VersionFiles.discoverVersions("/project");
		expect(result).toHaveLength(3);
		expect(result[0]).toEqual({ name: "pkg-a", path: "/project/packages/a", version: "1.0.0" });
		expect(result[1]).toEqual({ name: "pkg-b", path: "/project/packages/b", version: "2.0.0" });
	});

	it("includes root when not a workspace entry", () => {
		vi.mocked(getWorkspaceInfos).mockReturnValue([]);
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ name: "my-project", version: "3.0.0" }));

		const result = VersionFiles.discoverVersions("/project");
		expect(result).toHaveLength(1);
		expect(result[0].version).toBe("3.0.0");
	});

	it("handles workspace-tools failure gracefully", () => {
		vi.mocked(getWorkspaceInfos).mockImplementation(() => {
			throw new Error("failed");
		});
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ name: "root", version: "1.0.0" }));

		const result = VersionFiles.discoverVersions("/project");
		expect(result).toHaveLength(1);
	});
});

describe("VersionFiles.resolveVersion", () => {
	const workspaces = [
		{ name: "root", path: "/project", version: "1.0.0" },
		{ name: "pkg-a", path: "/project/packages/a", version: "2.0.0" },
		{ name: "pkg-b", path: "/project/packages/b", version: "3.0.0" },
	];

	it("matches file to its nearest workspace", () => {
		expect(VersionFiles.resolveVersion("/project/packages/a/plugin.json", workspaces, "0.0.0")).toBe("2.0.0");
	});

	it("matches root-level files to root version", () => {
		expect(VersionFiles.resolveVersion("/project/config.json", workspaces, "0.0.0")).toBe("1.0.0");
	});

	it("uses longest-prefix match", () => {
		// A file in pkg-a should match pkg-a (longer prefix), not root
		expect(VersionFiles.resolveVersion("/project/packages/a/sub/deep.json", workspaces, "0.0.0")).toBe("2.0.0");
	});

	it("falls back to root version when no workspace matches", () => {
		expect(VersionFiles.resolveVersion("/other/path/file.json", workspaces, "fallback")).toBe("fallback");
	});
});

describe("VersionFiles.resolveGlobs", () => {
	it("resolves glob patterns to absolute paths", () => {
		vi.mocked(globSync).mockReturnValue(["plugin.json", "sub/manifest.json"]);

		const configs = [{ glob: "**/*.json" }];
		const result = VersionFiles.resolveGlobs(configs, "/project");

		expect(result).toHaveLength(2);
		expect(result[0][0]).toBe(join(resolve("/project"), "plugin.json"));
		expect(result[1][0]).toBe(join(resolve("/project"), "sub/manifest.json"));
	});

	it("handles multiple configs", () => {
		vi.mocked(globSync).mockReturnValueOnce(["a.json"]).mockReturnValueOnce(["b.json", "c.json"]);

		const configs = [{ glob: "a.json" }, { glob: "**/b*.json" }];
		const result = VersionFiles.resolveGlobs(configs, "/project");

		expect(result).toHaveLength(3);
	});

	it("returns empty array when no files match", () => {
		vi.mocked(globSync).mockReturnValue([]);
		expect(VersionFiles.resolveGlobs([{ glob: "missing.json" }], "/project")).toHaveLength(0);
	});
});

describe("VersionFiles.detectIndent", () => {
	it("detects 2-space indentation", () => {
		expect(VersionFiles.detectIndent('{\n  "version": "1.0.0"\n}')).toBe("  ");
	});

	it("detects 4-space indentation", () => {
		expect(VersionFiles.detectIndent('{\n    "version": "1.0.0"\n}')).toBe("    ");
	});

	it("detects tab indentation", () => {
		expect(VersionFiles.detectIndent('{\n\t"version": "1.0.0"\n}')).toBe("\t");
	});

	it("defaults to 2 spaces when no indentation found", () => {
		expect(VersionFiles.detectIndent('{"version":"1.0.0"}')).toBe("  ");
	});
});

describe("VersionFiles.updateFile", () => {
	it("updates a single JSONPath and preserves formatting", () => {
		const content = '{\n  "version": "1.0.0"\n}\n';
		vi.mocked(readFileSync).mockReturnValue(content);

		const result = VersionFiles.updateFile("/project/plugin.json", ["$.version"], "2.0.0");

		expect(result).toBeDefined();
		expect(result?.version).toBe("2.0.0");
		expect(result?.previousValues).toEqual(["1.0.0"]);
		expect(vi.mocked(writeFileSync)).toHaveBeenCalledWith(
			"/project/plugin.json",
			'{\n  "version": "2.0.0"\n}\n',
			"utf-8",
		);
	});

	it("updates multiple JSONPath expressions", () => {
		const content = JSON.stringify({ metadata: { version: "1.0.0" }, plugins: [{ version: "1.0.0" }] }, null, 2);
		vi.mocked(readFileSync).mockReturnValue(content);

		const result = VersionFiles.updateFile(
			"/project/file.json",
			["$.metadata.version", "$.plugins[*].version"],
			"3.0.0",
		);

		expect(result).toBeDefined();
		expect(result?.previousValues).toEqual(["1.0.0", "1.0.0"]);
	});

	it("returns undefined when no paths match", () => {
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ other: "field" }));

		const result = VersionFiles.updateFile("/project/file.json", ["$.version"], "2.0.0");
		expect(result).toBeUndefined();
	});

	it("preserves trailing newline", () => {
		vi.mocked(readFileSync).mockReturnValue('{\n  "version": "1.0.0"\n}\n');

		VersionFiles.updateFile("/project/file.json", ["$.version"], "2.0.0");

		const written = vi.mocked(writeFileSync).mock.calls[0][1] as string;
		expect(written.endsWith("\n")).toBe(true);
	});

	it("does not add trailing newline when original lacks one", () => {
		vi.mocked(readFileSync).mockReturnValue('{\n  "version": "1.0.0"\n}');

		VersionFiles.updateFile("/project/file.json", ["$.version"], "2.0.0");

		const written = vi.mocked(writeFileSync).mock.calls[0][1] as string;
		expect(written.endsWith("}\n")).toBe(false);
		expect(written.endsWith("}")).toBe(true);
	});
});

describe("VersionFiles.processVersionFiles", () => {
	it("orchestrates full flow: discover, resolve, update", () => {
		vi.mocked(getWorkspaceInfos).mockReturnValue([]);
		vi.mocked(readFileSync).mockImplementation((p) => {
			const s = String(p);
			if (s.endsWith("package.json")) return JSON.stringify({ name: "my-project", version: "1.5.0" });
			if (s.endsWith("plugin.json")) return '{\n  "version": "1.0.0"\n}\n';
			throw new Error("ENOENT");
		});
		vi.mocked(globSync).mockReturnValue(["plugin.json"]);

		const configs = [{ glob: "plugin.json", paths: ["$.version"] }];
		const result = VersionFiles.processVersionFiles("/project", configs);

		expect(result).toHaveLength(1);
		expect(result[0].version).toBe("1.5.0");
		expect(vi.mocked(writeFileSync)).toHaveBeenCalled();
	});

	it("uses dry-run mode without writing files", () => {
		vi.mocked(getWorkspaceInfos).mockReturnValue([]);
		vi.mocked(readFileSync).mockImplementation((p) => {
			const s = String(p);
			if (s.endsWith("package.json")) return JSON.stringify({ name: "my-project", version: "1.5.0" });
			if (s.endsWith("plugin.json")) return JSON.stringify({ version: "1.0.0" });
			throw new Error("ENOENT");
		});
		vi.mocked(globSync).mockReturnValue(["plugin.json"]);

		const configs = [{ glob: "plugin.json" }];
		const result = VersionFiles.processVersionFiles("/project", configs, true);

		expect(result).toHaveLength(1);
		expect(result[0].version).toBe("1.5.0");
		expect(vi.mocked(writeFileSync)).not.toHaveBeenCalled();
	});

	it("defaults paths to $.version when not specified", () => {
		vi.mocked(getWorkspaceInfos).mockReturnValue([]);
		vi.mocked(readFileSync).mockImplementation((p) => {
			const s = String(p);
			if (s.endsWith("package.json")) return JSON.stringify({ name: "root", version: "2.0.0" });
			if (s.endsWith("test.json")) return JSON.stringify({ version: "1.0.0" });
			throw new Error("ENOENT");
		});
		vi.mocked(globSync).mockReturnValue(["test.json"]);

		const configs = [{ glob: "test.json" }];
		const result = VersionFiles.processVersionFiles("/project", configs, true);

		expect(result).toHaveLength(1);
		expect(result[0].jsonPaths).toEqual(["$.version"]);
	});

	it("skips files with no matching paths in dry-run mode", () => {
		vi.mocked(getWorkspaceInfos).mockReturnValue([]);
		vi.mocked(readFileSync).mockImplementation((p) => {
			const s = String(p);
			if (s.endsWith("package.json")) return JSON.stringify({ name: "root", version: "2.0.0" });
			if (s.endsWith("other.json")) return JSON.stringify({ unrelated: "field" });
			throw new Error("ENOENT");
		});
		vi.mocked(globSync).mockReturnValue(["other.json"]);

		const configs = [{ glob: "other.json", paths: ["$.version"] }];
		const result = VersionFiles.processVersionFiles("/project", configs, true);

		expect(result).toHaveLength(0);
	});

	it("returns empty array when no globs match", () => {
		vi.mocked(getWorkspaceInfos).mockReturnValue([]);
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ name: "root", version: "1.0.0" }));
		vi.mocked(globSync).mockReturnValue([]);

		const configs = [{ glob: "nonexistent.json" }];
		const result = VersionFiles.processVersionFiles("/project", configs);

		expect(result).toHaveLength(0);
	});
});
