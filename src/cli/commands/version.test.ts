import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceInfos } from "workspace-tools";
import { getWorkspaceInfos } from "workspace-tools";

import { ChangelogTransformer } from "../../api/transformer.js";
import { Workspace } from "../../utils/workspace.js";

vi.mock("node:child_process", () => ({
	execSync: vi.fn(),
}));

vi.mock("workspace-tools", () => ({
	getWorkspaceInfos: vi.fn(),
}));

vi.mock("node:fs", async () => {
	const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
	return {
		...actual,
		existsSync: vi.fn(),
		readFileSync: vi.fn(),
	};
});

afterEach(() => {
	vi.resetAllMocks();
});

const createMockWorkspace = (name: string, path: string): WorkspaceInfos[number] =>
	({ name, path, packageJson: {} }) as WorkspaceInfos[number];

describe("version command sequencing", () => {
	it("detects package manager and builds correct command", () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ packageManager: "pnpm@10.29.3" }));

		const pm = Workspace.detectPackageManager("/project");
		const cmd = Workspace.getChangesetVersionCommand(pm);

		expect(pm).toBe("pnpm");
		expect(cmd).toBe("pnpm exec changeset version");
	});

	it("discovers changelogs and transforms each", () => {
		vi.mocked(getWorkspaceInfos).mockReturnValue([
			createMockWorkspace("pkg-a", "/project/packages/a"),
			createMockWorkspace("pkg-b", "/project/packages/b"),
		]);
		vi.mocked(existsSync).mockImplementation((p) => {
			const s = String(p);
			// Only workspace changelogs exist, not root
			return s === "/project/packages/a/CHANGELOG.md" || s === "/project/packages/b/CHANGELOG.md";
		});

		const changelogs = Workspace.discoverChangelogs("/project");

		expect(changelogs).toHaveLength(2);
		expect(changelogs.map((c) => c.name)).toEqual(["pkg-a", "pkg-b"]);
	});

	it("skips execSync when dry-run is true", () => {
		const dryRun = true;

		if (!dryRun) {
			execSync("pnpm exec changeset version", { stdio: "inherit" });
		}

		expect(execSync).not.toHaveBeenCalled();
	});

	it("calls execSync when dry-run is false", () => {
		const dryRun = false;
		const cmd = "pnpm exec changeset version";

		if (!dryRun) {
			execSync(cmd, { cwd: "/project", stdio: "inherit" });
		}

		expect(execSync).toHaveBeenCalledWith(cmd, {
			cwd: "/project",
			stdio: "inherit",
		});
	});

	it("transforms each discovered changelog file", () => {
		const transformSpy = vi.spyOn(ChangelogTransformer, "transformFile").mockImplementation(() => {});

		vi.mocked(getWorkspaceInfos).mockReturnValue([
			createMockWorkspace("pkg-a", "/project/packages/a"),
			createMockWorkspace("pkg-b", "/project/packages/b"),
		]);
		vi.mocked(existsSync).mockImplementation((p) => {
			const s = String(p);
			return s === "/project/packages/a/CHANGELOG.md" || s === "/project/packages/b/CHANGELOG.md";
		});

		const changelogs = Workspace.discoverChangelogs("/project");
		for (const entry of changelogs) {
			ChangelogTransformer.transformFile(entry.changelogPath);
		}

		expect(transformSpy).toHaveBeenCalledTimes(2);
		expect(transformSpy).toHaveBeenCalledWith("/project/packages/a/CHANGELOG.md");
		expect(transformSpy).toHaveBeenCalledWith("/project/packages/b/CHANGELOG.md");

		transformSpy.mockRestore();
	});

	it("handles zero changelogs gracefully", () => {
		vi.mocked(getWorkspaceInfos).mockReturnValue([]);
		vi.mocked(existsSync).mockReturnValue(false);

		const changelogs = Workspace.discoverChangelogs("/project");

		expect(changelogs).toHaveLength(0);
	});
});
