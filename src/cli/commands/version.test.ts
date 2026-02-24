import { execSync } from "node:child_process";
import { Effect, Logger } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runVersion } from "./version.js";

vi.mock("node:child_process", () => ({
	execSync: vi.fn(),
}));

vi.mock("../../utils/workspace.js", () => ({
	Workspace: {
		detectPackageManager: vi.fn(),
		getChangesetVersionCommand: vi.fn(),
		discoverChangelogs: vi.fn(),
	},
}));

vi.mock("../../api/transformer.js", () => ({
	ChangelogTransformer: {
		transformFile: vi.fn(),
	},
}));

vi.mock("../../utils/version-files.js", () => ({
	VersionFiles: {
		readConfig: vi.fn(),
		processVersionFiles: vi.fn(),
	},
}));

// Import the mocked modules so we can configure them per-test
import { ChangelogTransformer } from "../../api/transformer.js";
import { VersionFiles } from "../../utils/version-files.js";
import { Workspace } from "../../utils/workspace.js";

const silentLogger = Logger.replace(Logger.defaultLogger, Logger.none);

afterEach(() => {
	vi.resetAllMocks();
});

describe("runVersion Effect handler", () => {
	it("skips execSync and logs dry-run message when dryRun is true", async () => {
		vi.mocked(Workspace.detectPackageManager).mockReturnValue("pnpm");
		vi.mocked(Workspace.discoverChangelogs).mockReturnValue([]);

		await Effect.runPromise(runVersion(true).pipe(Effect.provide(silentLogger)));

		expect(execSync).not.toHaveBeenCalled();
		expect(Workspace.detectPackageManager).toHaveBeenCalled();
		expect(Workspace.discoverChangelogs).toHaveBeenCalled();
	});

	it("runs execSync with changeset version command when dryRun is false", async () => {
		vi.mocked(Workspace.detectPackageManager).mockReturnValue("pnpm");
		vi.mocked(Workspace.getChangesetVersionCommand).mockReturnValue("pnpm exec changeset version");
		vi.mocked(Workspace.discoverChangelogs).mockReturnValue([]);

		await Effect.runPromise(runVersion(false).pipe(Effect.provide(silentLogger)));

		expect(Workspace.getChangesetVersionCommand).toHaveBeenCalledWith("pnpm");
		expect(execSync).toHaveBeenCalledWith("pnpm exec changeset version", {
			cwd: process.cwd(),
			stdio: "inherit",
		});
	});

	it("handles zero changelogs gracefully", async () => {
		vi.mocked(Workspace.detectPackageManager).mockReturnValue("npm");
		vi.mocked(Workspace.discoverChangelogs).mockReturnValue([]);

		await Effect.runPromise(runVersion(true).pipe(Effect.provide(silentLogger)));

		expect(Workspace.discoverChangelogs).toHaveBeenCalledWith(process.cwd());
		expect(ChangelogTransformer.transformFile).not.toHaveBeenCalled();
	});

	it("transforms each discovered changelog file", async () => {
		vi.mocked(Workspace.detectPackageManager).mockReturnValue("pnpm");
		vi.mocked(Workspace.discoverChangelogs).mockReturnValue([
			{ name: "pkg-a", path: "/project/packages/a", changelogPath: "/project/packages/a/CHANGELOG.md" },
			{ name: "pkg-b", path: "/project/packages/b", changelogPath: "/project/packages/b/CHANGELOG.md" },
		]);

		await Effect.runPromise(runVersion(true).pipe(Effect.provide(silentLogger)));

		expect(ChangelogTransformer.transformFile).toHaveBeenCalledTimes(2);
		expect(ChangelogTransformer.transformFile).toHaveBeenCalledWith("/project/packages/a/CHANGELOG.md");
		expect(ChangelogTransformer.transformFile).toHaveBeenCalledWith("/project/packages/b/CHANGELOG.md");
	});

	it("uses process.cwd() for package manager detection and changelog discovery", async () => {
		const cwd = process.cwd();
		vi.mocked(Workspace.detectPackageManager).mockReturnValue("npm");
		vi.mocked(Workspace.discoverChangelogs).mockReturnValue([]);

		await Effect.runPromise(runVersion(true).pipe(Effect.provide(silentLogger)));

		expect(Workspace.detectPackageManager).toHaveBeenCalledWith(cwd);
		expect(Workspace.discoverChangelogs).toHaveBeenCalledWith(cwd);
	});

	it("rejects when execSync throws an error", async () => {
		vi.mocked(Workspace.detectPackageManager).mockReturnValue("pnpm");
		vi.mocked(Workspace.getChangesetVersionCommand).mockReturnValue("pnpm exec changeset version");
		vi.mocked(execSync).mockImplementation(() => {
			throw new Error("command not found");
		});

		await expect(Effect.runPromise(runVersion(false).pipe(Effect.provide(silentLogger)))).rejects.toThrow(
			"changeset version failed: command not found",
		);
	});

	it("rejects when transformFile throws an error", async () => {
		vi.mocked(Workspace.detectPackageManager).mockReturnValue("pnpm");
		vi.mocked(Workspace.discoverChangelogs).mockReturnValue([
			{ name: "pkg-a", path: "/project/packages/a", changelogPath: "/project/packages/a/CHANGELOG.md" },
		]);
		vi.mocked(ChangelogTransformer.transformFile).mockImplementation(() => {
			throw new Error("ENOENT: no such file");
		});

		await expect(Effect.runPromise(runVersion(true).pipe(Effect.provide(silentLogger)))).rejects.toThrow(
			"Failed to transform /project/packages/a/CHANGELOG.md: ENOENT: no such file",
		);
	});

	it("skips version files when readConfig returns undefined", async () => {
		vi.mocked(Workspace.detectPackageManager).mockReturnValue("pnpm");
		vi.mocked(Workspace.discoverChangelogs).mockReturnValue([]);
		vi.mocked(VersionFiles.readConfig).mockReturnValue(undefined);

		await Effect.runPromise(runVersion(true).pipe(Effect.provide(silentLogger)));

		expect(VersionFiles.readConfig).toHaveBeenCalledWith(process.cwd());
		expect(VersionFiles.processVersionFiles).not.toHaveBeenCalled();
	});

	it("processes version files when config is present", async () => {
		vi.mocked(Workspace.detectPackageManager).mockReturnValue("pnpm");
		vi.mocked(Workspace.discoverChangelogs).mockReturnValue([]);
		const configs = [{ glob: "plugin.json", paths: ["$.version"] }];
		vi.mocked(VersionFiles.readConfig).mockReturnValue(configs);
		vi.mocked(VersionFiles.processVersionFiles).mockReturnValue([
			{ filePath: "/project/plugin.json", jsonPaths: ["$.version"], version: "2.0.0", previousValues: ["1.0.0"] },
		]);

		await Effect.runPromise(runVersion(true).pipe(Effect.provide(silentLogger)));

		expect(VersionFiles.processVersionFiles).toHaveBeenCalledWith(process.cwd(), configs, true);
	});

	it("passes dryRun=false to processVersionFiles when not in dry-run mode", async () => {
		vi.mocked(Workspace.detectPackageManager).mockReturnValue("pnpm");
		vi.mocked(Workspace.getChangesetVersionCommand).mockReturnValue("pnpm exec changeset version");
		vi.mocked(Workspace.discoverChangelogs).mockReturnValue([]);
		const configs = [{ glob: "plugin.json" }];
		vi.mocked(VersionFiles.readConfig).mockReturnValue(configs);
		vi.mocked(VersionFiles.processVersionFiles).mockReturnValue([]);

		await Effect.runPromise(runVersion(false).pipe(Effect.provide(silentLogger)));

		expect(VersionFiles.processVersionFiles).toHaveBeenCalledWith(process.cwd(), configs, false);
	});

	it("rejects when processVersionFiles throws an error", async () => {
		vi.mocked(Workspace.detectPackageManager).mockReturnValue("pnpm");
		vi.mocked(Workspace.discoverChangelogs).mockReturnValue([]);
		vi.mocked(VersionFiles.readConfig).mockReturnValue([{ glob: "plugin.json" }]);
		vi.mocked(VersionFiles.processVersionFiles).mockImplementation(() => {
			throw new Error("EACCES: permission denied");
		});

		await expect(Effect.runPromise(runVersion(true).pipe(Effect.provide(silentLogger)))).rejects.toThrow(
			"Version file update failed: EACCES: permission denied",
		);
	});
});
