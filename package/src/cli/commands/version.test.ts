import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { ChangesetConfigReader } from "@savvy-web/silk-effects";
import { Effect, Layer, Logger } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PackageManagerDetector, WorkspaceDiscovery } from "workspaces-effect";

import { runVersion } from "./version.js";

vi.mock("node:child_process", () => ({
	execSync: vi.fn(),
}));

vi.mock("node:fs", () => ({
	existsSync: vi.fn(),
	readFileSync: vi.fn(),
}));

vi.mock("../../api/transformer.js", () => ({
	ChangelogTransformer: {
		transformFile: vi.fn(),
	},
}));

vi.mock("../../utils/version-files.js", () => ({
	VersionFiles: {
		extractVersionFiles: vi.fn(),
		processVersionFiles: vi.fn(),
	},
}));

// Import the mocked modules so we can configure them per-test
import { ChangelogTransformer } from "../../api/transformer.js";
import { VersionFiles } from "../../utils/version-files.js";

const silentLogger = Logger.replace(Logger.defaultLogger, Logger.none);

const TestChangesetConfigReaderLayer = Layer.succeed(ChangesetConfigReader, {
	read: () => Effect.succeed({ changelog: undefined }),
});

const TestPackageManagerDetectorLayer = Layer.succeed(PackageManagerDetector, {
	detect: () => Effect.succeed({ type: "pnpm" as const, version: "10.0.0" }),
});

const TestWorkspaceDiscoveryLayer = Layer.succeed(WorkspaceDiscovery, {
	listPackages: () => Effect.succeed([]),
	getPackage: () => Effect.fail({ _tag: "PackageNotFoundError" as const, name: "", reason: "" } as never),
});

const TestLayers = Layer.mergeAll(
	TestChangesetConfigReaderLayer,
	TestPackageManagerDetectorLayer,
	TestWorkspaceDiscoveryLayer,
);

afterEach(() => {
	vi.resetAllMocks();
});

describe("runVersion Effect handler", () => {
	it("skips execSync and logs dry-run message when dryRun is true", async () => {
		await Effect.runPromise(runVersion(true).pipe(Effect.provide(TestLayers), Effect.provide(silentLogger)));

		expect(execSync).not.toHaveBeenCalled();
	});

	it("runs execSync with changeset version command when dryRun is false", async () => {
		await Effect.runPromise(runVersion(false).pipe(Effect.provide(TestLayers), Effect.provide(silentLogger)));

		expect(execSync).toHaveBeenCalledWith("pnpm exec changeset version", {
			cwd: process.cwd(),
			stdio: "inherit",
		});
	});

	it("handles zero changelogs gracefully", async () => {
		await Effect.runPromise(runVersion(true).pipe(Effect.provide(TestLayers), Effect.provide(silentLogger)));

		expect(ChangelogTransformer.transformFile).not.toHaveBeenCalled();
	});

	it("transforms each discovered changelog file", async () => {
		const packagesLayer = Layer.succeed(WorkspaceDiscovery, {
			listPackages: () =>
				Effect.succeed([
					{ name: "pkg-a", version: "1.0.0", path: "/project/packages/a" },
					{ name: "pkg-b", version: "2.0.0", path: "/project/packages/b" },
				] as never),
			getPackage: () => Effect.fail({ _tag: "PackageNotFoundError" as const, name: "", reason: "" } as never),
		});

		vi.mocked(existsSync).mockImplementation((p) => {
			const s = String(p);
			// Only workspace packages have changelogs, not root
			return s.endsWith("packages/a/CHANGELOG.md") || s.endsWith("packages/b/CHANGELOG.md");
		});

		await Effect.runPromise(
			runVersion(true).pipe(
				Effect.provide(Layer.mergeAll(TestChangesetConfigReaderLayer, TestPackageManagerDetectorLayer, packagesLayer)),
				Effect.provide(silentLogger),
			),
		);

		expect(ChangelogTransformer.transformFile).toHaveBeenCalledTimes(2);
		expect(ChangelogTransformer.transformFile).toHaveBeenCalledWith("/project/packages/a/CHANGELOG.md");
		expect(ChangelogTransformer.transformFile).toHaveBeenCalledWith("/project/packages/b/CHANGELOG.md");
	});

	it("rejects when execSync throws an error", async () => {
		vi.mocked(execSync).mockImplementation(() => {
			throw new Error("command not found");
		});

		await expect(
			Effect.runPromise(runVersion(false).pipe(Effect.provide(TestLayers), Effect.provide(silentLogger))),
		).rejects.toThrow("changeset version failed: command not found");
	});

	it("rejects when transformFile throws an error", async () => {
		const packagesLayer = Layer.succeed(WorkspaceDiscovery, {
			listPackages: () => Effect.succeed([{ name: "pkg-a", version: "1.0.0", path: "/project/packages/a" }] as never),
			getPackage: () => Effect.fail({ _tag: "PackageNotFoundError" as const, name: "", reason: "" } as never),
		});

		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(ChangelogTransformer.transformFile).mockImplementation(() => {
			throw new Error("ENOENT: no such file");
		});

		await expect(
			Effect.runPromise(
				runVersion(true).pipe(
					Effect.provide(
						Layer.mergeAll(TestChangesetConfigReaderLayer, TestPackageManagerDetectorLayer, packagesLayer),
					),
					Effect.provide(silentLogger),
				),
			),
		).rejects.toThrow("Failed to transform /project/packages/a/CHANGELOG.md: ENOENT: no such file");
	});

	it("skips version files when extractVersionFiles returns undefined", async () => {
		vi.mocked(VersionFiles.extractVersionFiles).mockReturnValue(undefined);

		await Effect.runPromise(runVersion(true).pipe(Effect.provide(TestLayers), Effect.provide(silentLogger)));

		expect(VersionFiles.processVersionFiles).not.toHaveBeenCalled();
	});

	it("processes version files when config is present", async () => {
		const configs = [{ glob: "plugin.json", paths: ["$.version"] }];
		vi.mocked(VersionFiles.extractVersionFiles).mockReturnValue(configs);
		vi.mocked(VersionFiles.processVersionFiles).mockReturnValue([
			{ filePath: "/project/plugin.json", jsonPaths: ["$.version"], version: "2.0.0", previousValues: ["1.0.0"] },
		]);

		await Effect.runPromise(runVersion(true).pipe(Effect.provide(TestLayers), Effect.provide(silentLogger)));

		expect(VersionFiles.processVersionFiles).toHaveBeenCalledWith(process.cwd(), configs, true, []);
	});

	it("passes dryRun=false to processVersionFiles when not in dry-run mode", async () => {
		const configs = [{ glob: "plugin.json" }];
		vi.mocked(VersionFiles.extractVersionFiles).mockReturnValue(configs);
		vi.mocked(VersionFiles.processVersionFiles).mockReturnValue([]);

		await Effect.runPromise(runVersion(false).pipe(Effect.provide(TestLayers), Effect.provide(silentLogger)));

		expect(VersionFiles.processVersionFiles).toHaveBeenCalledWith(process.cwd(), configs, false, []);
	});

	it("rejects when processVersionFiles throws an error", async () => {
		vi.mocked(VersionFiles.extractVersionFiles).mockReturnValue([{ glob: "plugin.json" }]);
		vi.mocked(VersionFiles.processVersionFiles).mockImplementation(() => {
			throw new Error("Failed to update /project/plugin.json: EACCES: permission denied");
		});

		await expect(
			Effect.runPromise(runVersion(true).pipe(Effect.provide(TestLayers), Effect.provide(silentLogger))),
		).rejects.toThrow("EACCES: permission denied");
	});

	it("extracts per-file path into VersionFileError.filePath", async () => {
		vi.mocked(VersionFiles.extractVersionFiles).mockReturnValue([{ glob: "plugin.json" }]);
		vi.mocked(VersionFiles.processVersionFiles).mockImplementation(() => {
			throw new Error("Failed to update /project/plugin.json: EACCES: permission denied");
		});

		const exit = await Effect.runPromiseExit(
			runVersion(true).pipe(Effect.provide(TestLayers), Effect.provide(silentLogger)),
		);
		expect(exit._tag).toBe("Failure");
		if (exit._tag === "Failure") {
			const err = exit.cause as { _tag: string; error?: { filePath?: string } };
			expect(err.error?.filePath).toBe("/project/plugin.json");
		}
	});

	it("falls back to npm when PackageManagerDetector fails", async () => {
		const failingDetectorLayer = Layer.succeed(PackageManagerDetector, {
			detect: () => Effect.fail({ _tag: "PackageManagerDetectionError" as const, reason: "no pm found" } as never),
		});

		await Effect.runPromise(
			runVersion(false).pipe(
				Effect.provide(
					Layer.mergeAll(TestChangesetConfigReaderLayer, failingDetectorLayer, TestWorkspaceDiscoveryLayer),
				),
				Effect.provide(silentLogger),
			),
		);

		expect(execSync).toHaveBeenCalledWith("npx changeset version", {
			cwd: process.cwd(),
			stdio: "inherit",
		});
	});
});
