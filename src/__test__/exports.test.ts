/**
 * Coverage tests for barrel export modules.
 *
 * These modules are re-export entry points that are never imported
 * by other tests (which import from individual modules directly).
 * Importing them here ensures their module-level code is executed.
 */

import { describe, expect, it } from "vitest";

describe("main entry point (src/index.ts)", () => {
	it("exports class-based API", async () => {
		const mod = await import("../index.js");
		expect(mod.Categories).toBeDefined();
		expect(mod.ChangesetLinter).toBeDefined();
		expect(mod.ChangelogTransformer).toBeDefined();
		expect(mod.Changelog).toBeDefined();
	});

	it("exports Effect services", async () => {
		const mod = await import("../index.js");
		expect(mod.ChangelogService).toBeDefined();
		expect(mod.GitHubService).toBeDefined();
		expect(mod.MarkdownService).toBeDefined();
	});

	it("exports layers", async () => {
		const mod = await import("../index.js");
		expect(mod.GitHubLive).toBeDefined();
		expect(mod.MarkdownLive).toBeDefined();
	});

	it("exports tagged errors", async () => {
		const mod = await import("../index.js");
		expect(mod.ChangesetValidationError).toBeDefined();
		expect(mod.ConfigurationError).toBeDefined();
		expect(mod.GitHubApiError).toBeDefined();
		expect(mod.MarkdownParseError).toBeDefined();
	});

	it("exports schemas", async () => {
		const mod = await import("../index.js");
		expect(mod.ChangesetOptionsSchema).toBeDefined();
		expect(mod.RepoSchema).toBeDefined();
		expect(mod.SectionCategorySchema).toBeDefined();
		expect(mod.ChangesetSchema).toBeDefined();
		expect(mod.CommitHashSchema).toBeDefined();
		expect(mod.GitHubInfoSchema).toBeDefined();
		expect(mod.NonEmptyString).toBeDefined();
		expect(mod.PositiveInteger).toBeDefined();
	});
});

describe("remark entry point (src/remark/index.ts)", () => {
	it("exports lint rules", async () => {
		const mod = await import("../remark/index.js");
		expect(mod.HeadingHierarchyRule).toBeDefined();
		expect(mod.RequiredSectionsRule).toBeDefined();
		expect(mod.ContentStructureRule).toBeDefined();
	});

	it("exports transform plugins", async () => {
		const mod = await import("../remark/index.js");
		expect(mod.MergeSectionsPlugin).toBeDefined();
		expect(mod.ReorderSectionsPlugin).toBeDefined();
		expect(mod.DeduplicateItemsPlugin).toBeDefined();
		expect(mod.ContributorFootnotesPlugin).toBeDefined();
		expect(mod.IssueLinkRefsPlugin).toBeDefined();
		expect(mod.NormalizeFormatPlugin).toBeDefined();
	});

	it("exports presets", async () => {
		const mod = await import("../remark/index.js");
		expect(mod.SilkChangesetPreset).toHaveLength(3);
		expect(mod.SilkChangesetTransformPreset).toHaveLength(6);
	});
});

describe("remark presets (src/remark/presets.ts)", () => {
	it("SilkChangesetPreset contains lint rules", async () => {
		const { SilkChangesetPreset } = await import("../remark/presets.js");
		expect(SilkChangesetPreset).toHaveLength(3);
	});

	it("SilkChangesetTransformPreset contains transform plugins in order", async () => {
		const { SilkChangesetTransformPreset } = await import("../remark/presets.js");
		expect(SilkChangesetTransformPreset).toHaveLength(6);
	});
});

describe("markdownlint entry point (src/markdownlint/index.ts)", () => {
	it("exports default rules array", async () => {
		const mod = await import("../markdownlint/index.js");
		expect(mod.default).toHaveLength(3);
	});

	it("exports individual rules", async () => {
		const mod = await import("../markdownlint/index.js");
		expect(mod.HeadingHierarchyRule).toBeDefined();
		expect(mod.RequiredSectionsRule).toBeDefined();
		expect(mod.ContentStructureRule).toBeDefined();
	});
});
