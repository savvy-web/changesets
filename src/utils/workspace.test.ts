import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceInfos } from "workspace-tools";
import { getWorkspaceInfos } from "workspace-tools";

import { Workspace } from "./workspace.js";

// Helper to create mock workspace info
const createMockWorkspace = (name: string, path: string): WorkspaceInfos[number] =>
	({ name, path, packageJson: {} }) as WorkspaceInfos[number];

vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
	readFileSync: vi.fn(),
}));

vi.mock("workspace-tools", () => ({
	getWorkspaceInfos: vi.fn(),
}));

afterEach(() => {
	vi.resetAllMocks();
});

describe("Workspace.detectPackageManager", () => {
	it("detects pnpm from packageManager field", () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ packageManager: "pnpm@10.29.3" }));

		expect(Workspace.detectPackageManager("/project")).toBe("pnpm");
	});

	it("detects npm from packageManager field", () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ packageManager: "npm@10.0.0" }));

		expect(Workspace.detectPackageManager("/project")).toBe("npm");
	});

	it("detects yarn from packageManager field", () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ packageManager: "yarn@4.0.0" }));

		expect(Workspace.detectPackageManager("/project")).toBe("yarn");
	});

	it("detects bun from packageManager field", () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ packageManager: "bun@1.0.0" }));

		expect(Workspace.detectPackageManager("/project")).toBe("bun");
	});

	it("falls back to npm when packageManager field is missing", () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify({}));

		expect(Workspace.detectPackageManager("/project")).toBe("npm");
	});

	it("falls back to npm when packageManager is unrecognized", () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ packageManager: "unknown-pm@1.0.0" }));

		expect(Workspace.detectPackageManager("/project")).toBe("npm");
	});

	it("falls back to npm when package.json does not exist", () => {
		vi.mocked(existsSync).mockReturnValue(false);

		expect(Workspace.detectPackageManager("/project")).toBe("npm");
	});

	it("falls back to npm when package.json is invalid JSON", () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue("not json {{{");

		expect(Workspace.detectPackageManager("/project")).toBe("npm");
	});
});

describe("Workspace.getChangesetVersionCommand", () => {
	it("returns pnpm exec command", () => {
		expect(Workspace.getChangesetVersionCommand("pnpm")).toBe("pnpm exec changeset version");
	});

	it("returns yarn exec command", () => {
		expect(Workspace.getChangesetVersionCommand("yarn")).toBe("yarn exec changeset version");
	});

	it("returns bun x command", () => {
		expect(Workspace.getChangesetVersionCommand("bun")).toBe("bun x changeset version");
	});

	it("returns npx command for npm", () => {
		expect(Workspace.getChangesetVersionCommand("npm")).toBe("npx changeset version");
	});
});

describe("Workspace.discoverChangelogs", () => {
	it("discovers changelogs from workspace packages", () => {
		vi.mocked(getWorkspaceInfos).mockReturnValue([
			createMockWorkspace("pkg-a", "/project/packages/a"),
			createMockWorkspace("pkg-b", "/project/packages/b"),
		]);
		vi.mocked(existsSync).mockImplementation((p) => {
			const s = String(p);
			// Both packages have changelogs, root does not
			return s.endsWith("packages/a/CHANGELOG.md") || s.endsWith("packages/b/CHANGELOG.md");
		});

		const result = Workspace.discoverChangelogs("/project");

		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({
			name: "pkg-a",
			path: "/project/packages/a",
			changelogPath: "/project/packages/a/CHANGELOG.md",
		});
		expect(result[1]).toEqual({
			name: "pkg-b",
			path: "/project/packages/b",
			changelogPath: "/project/packages/b/CHANGELOG.md",
		});
	});

	it("includes root changelog when not a workspace entry", () => {
		const cwd = "/project";
		vi.mocked(getWorkspaceInfos).mockReturnValue([createMockWorkspace("pkg-a", "/project/packages/a")]);
		vi.mocked(existsSync).mockImplementation((p) => {
			const s = String(p);
			return s.endsWith("packages/a/CHANGELOG.md") || s === join(resolve(cwd), "CHANGELOG.md");
		});
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ name: "@savvy-web/root" }));

		const result = Workspace.discoverChangelogs(cwd);

		expect(result).toHaveLength(2);
		expect(result[1]).toEqual({
			name: "@savvy-web/root",
			path: resolve(cwd),
			changelogPath: join(resolve(cwd), "CHANGELOG.md"),
		});
	});

	it("deduplicates root when it appears as a workspace entry", () => {
		const cwd = "/project";
		const resolvedCwd = resolve(cwd);
		vi.mocked(getWorkspaceInfos).mockReturnValue([createMockWorkspace("my-pkg", resolvedCwd)]);
		vi.mocked(existsSync).mockReturnValue(true);

		const result = Workspace.discoverChangelogs(cwd);

		// Root is already in the workspace list — should not appear twice
		expect(result).toHaveLength(1);
		expect(result[0]?.name).toBe("my-pkg");
	});

	it("skips packages without CHANGELOG.md", () => {
		vi.mocked(getWorkspaceInfos).mockReturnValue([
			createMockWorkspace("pkg-a", "/project/packages/a"),
			createMockWorkspace("pkg-b", "/project/packages/b"),
		]);
		vi.mocked(existsSync).mockImplementation((p) => {
			// Only pkg-a has a changelog
			return String(p).endsWith("packages/a/CHANGELOG.md");
		});

		const result = Workspace.discoverChangelogs("/project");

		expect(result).toHaveLength(1);
		expect(result[0]?.name).toBe("pkg-a");
	});

	it("returns only root when workspace-tools fails", () => {
		const cwd = "/project";
		vi.mocked(getWorkspaceInfos).mockImplementation(() => {
			throw new Error("workspace detection failed");
		});
		vi.mocked(existsSync).mockImplementation((p) => {
			return String(p) === join(resolve(cwd), "CHANGELOG.md");
		});
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ name: "root-pkg" }));

		const result = Workspace.discoverChangelogs(cwd);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			name: "root-pkg",
			path: resolve(cwd),
			changelogPath: join(resolve(cwd), "CHANGELOG.md"),
		});
	});

	it("returns empty array when no changelogs exist", () => {
		vi.mocked(getWorkspaceInfos).mockReturnValue([]);
		vi.mocked(existsSync).mockReturnValue(false);

		const result = Workspace.discoverChangelogs("/project");

		expect(result).toHaveLength(0);
	});

	it("uses 'root' as name when package.json is unreadable", () => {
		const cwd = "/project";
		vi.mocked(getWorkspaceInfos).mockReturnValue([]);
		vi.mocked(existsSync).mockImplementation((p) => {
			return String(p) === join(resolve(cwd), "CHANGELOG.md");
		});
		vi.mocked(readFileSync).mockImplementation(() => {
			throw new Error("ENOENT");
		});

		const result = Workspace.discoverChangelogs(cwd);

		expect(result).toHaveLength(1);
		expect(result[0]?.name).toBe("root");
	});

	it("handles workspace-tools returning undefined", () => {
		vi.mocked(getWorkspaceInfos).mockReturnValue(undefined as unknown as WorkspaceInfos);
		vi.mocked(existsSync).mockReturnValue(false);

		const result = Workspace.discoverChangelogs("/project");

		expect(result).toHaveLength(0);
	});
});
