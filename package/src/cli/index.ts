/**
 * CLI entry point using `\@effect/cli`.
 *
 * Provides the `savvy-changesets` CLI application with subcommands for
 * initializing, linting, transforming, checking, validating, versioning,
 * inspecting config, classifying paths, analyzing branches, and listing
 * release surfaces. The root command is assembled from the individual
 * subcommand modules and executed via `\@effect/platform-node`.
 *
 * @remarks
 * Top-level subcommands:
 * - `init`             -- bootstrap a repository for \@savvy-web/changesets
 * - `lint`             -- machine-readable changeset validation
 * - `check`            -- human-readable validation summary
 * - `transform`        -- CHANGELOG.md post-processing
 * - `validate-file`    -- validate a single changeset file
 * - `version`          -- run `changeset version` and transform all CHANGELOGs
 * - `config`           -- config inspection (`show`, `validate`)
 * - `classify`         -- map paths to owning packages
 * - `analyze-branch`   -- diff against base + classify every changed file
 * - `release-surface`  -- list every path owned by a package
 *
 * The CLI version is injected at build time via the `__PACKAGE_VERSION__`
 * environment variable.
 *
 * @example
 * ```bash
 * savvy-changesets lint .changeset
 * savvy-changesets config show --json
 * savvy-changesets analyze-branch --base main --json
 * savvy-changesets classify packages/foo/src/index.ts plugin/SKILL.md
 * ```
 *
 * @internal
 */

import { Command } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { ChangesetConfigReaderLive } from "@savvy-web/silk-effects";
import { Effect, Layer } from "effect";
import { PackageManagerDetectorLive, WorkspaceDiscoveryLive, WorkspaceRootLive } from "workspaces-effect";

import { BranchAnalyzerLive } from "../services/branch-analyzer.js";
import { ConfigInspectorLive } from "../services/config-inspector.js";
import { SilkPublishabilityDetectorLive } from "../services/silk-publishability.js";
import { WorkspaceSnapshotReaderLive } from "../services/workspace-snapshot.js";
import { analyzeBranchCommand } from "./commands/analyze-branch.js";
import { checkCommand } from "./commands/check.js";
import { classifyCommand } from "./commands/classify.js";
import { configShowCommand } from "./commands/config-show.js";
import { configValidateCommand } from "./commands/config-validate.js";
import { depsDetectCommand } from "./commands/deps-detect.js";
import { depsRegenCommand } from "./commands/deps-regen.js";
import { initCommand } from "./commands/init.js";
import { lintCommand } from "./commands/lint.js";
import { releaseSurfaceCommand } from "./commands/release-surface.js";
import { transformCommand } from "./commands/transform.js";
import { validateFileCommand } from "./commands/validate-file.js";
import { versionCommand } from "./commands/version.js";

/* v8 ignore start -- CLI registration; each command tested via exported handler */

/**
 * `config` group — nests `show` and `validate` under one subcommand so the
 * surface reads `savvy-changesets config show` / `savvy-changesets config validate`.
 */
const configCommand = Command.make("config").pipe(
	Command.withSubcommands([configShowCommand, configValidateCommand]),
	Command.withDescription("Inspect or validate .changeset/config.json"),
);

/**
 * `deps` group — nests `detect` (read-only) and `regen` (destructive) under
 * one subcommand so the surface reads `savvy-changesets deps detect` /
 * `savvy-changesets deps regen`.
 */
const depsCommand = Command.make("deps").pipe(
	Command.withSubcommands([depsDetectCommand, depsRegenCommand]),
	Command.withDescription("Generate or regenerate dependency changesets"),
);

const rootCommand = Command.make("savvy-changesets").pipe(
	Command.withSubcommands([
		initCommand,
		lintCommand,
		transformCommand,
		checkCommand,
		validateFileCommand,
		versionCommand,
		configCommand,
		classifyCommand,
		analyzeBranchCommand,
		releaseSurfaceCommand,
		depsCommand,
	]),
);

const cli = Command.run(rootCommand, {
	name: "savvy-changesets",
	version: process.env.__PACKAGE_VERSION__ ?? "0.0.0",
});

/**
 * Bootstrap and run the `savvy-changesets` CLI application.
 *
 * Creates an Effect program from the parsed `process.argv`, provides every
 * layer the registered commands transitively require, and hands execution
 * to `NodeRuntime.runMain`.
 *
 * Layer wiring:
 * - `NodeContext.layer` — `FileSystem` and `Path` from `@effect/platform-node`,
 *   consumed by `ChangesetConfigReaderLive` and `WorkspaceDiscoveryLive`.
 * - Workspace services — `WorkspaceRootLive`, `PackageManagerDetectorLive`,
 *   `WorkspaceDiscoveryLive`. Required by `version` (existing) and the new
 *   inspector chain.
 * - `ChangesetConfigReaderLive` — required by `ConfigInspectorLive` and the
 *   `version` command's config reads.
 * - `ConfigInspectorLive` — required by every new command introduced in 0.9.0.
 * - `BranchAnalyzerLive` — required by `analyze-branch`.
 *
 * @internal
 */
export function runCli(): void {
	const main = Effect.suspend(() => cli(process.argv)).pipe(
		Effect.provide(
			BranchAnalyzerLive.pipe(
				Layer.provide(ConfigInspectorLive),
				Layer.provideMerge(ConfigInspectorLive),
				Layer.provideMerge(WorkspaceSnapshotReaderLive),
				Layer.provideMerge(SilkPublishabilityDetectorLive),
				Layer.provideMerge(
					Layer.mergeAll(
						ChangesetConfigReaderLive,
						WorkspaceRootLive,
						PackageManagerDetectorLive,
						WorkspaceDiscoveryLive.pipe(Layer.provide(WorkspaceRootLive)),
					),
				),
				Layer.provideMerge(NodeContext.layer),
			),
		),
	);
	NodeRuntime.runMain(main);
}
/* v8 ignore stop */
