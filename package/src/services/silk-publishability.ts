/**
 * Silk-flavored publishability rules for workspaces-effect's
 * `PublishabilityDetector` tag.
 *
 * @remarks
 * This is a lift of the publishability logic that originated in
 * `silk-update-action`. The vanilla
 * {@link PublishabilityDetectorLive} treats `package.json#private: true`
 * as "not publishable" full stop. The silk-suite convention extends that
 * with:
 *
 * 1. A private package whose `publishConfig.access` is set is still
 *    publishable to one target (the access value tells npm what
 *    visibility to use).
 * 2. A private package with `publishConfig.targets` (an array of
 *    target specs) is publishable to one or more targets — string
 *    targets inherit parent access, object targets may override.
 * 3. Shorthand target names (e.g., `"npm"` / `"github"` / `"jsr"`) are
 *    accepted as string-form targets without any registry mapping
 *    happening here — the consumer maps shorthand to a registry URL
 *    at publish time.
 *
 * `@savvy-web/changesets` consumes this via `PublishabilityDetector` in
 * the dependency-diff commands to filter out workspace packages that
 * cannot publish (their dep changes would never end up in a release).
 *
 * The eventual home is `@savvy-web/silk-effects`; until then it lives
 * here so the changesets CLI doesn't depend on the action repo.
 *
 * @packageDocumentation
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Effect, Layer } from "effect";
import type { WorkspacePackage } from "workspaces-effect";
import { PublishTarget, PublishabilityDetector } from "workspaces-effect";

interface RawTargetSpec {
	readonly access?: "public" | "restricted";
	readonly registry?: string;
}

type RawTarget = string | RawTargetSpec;

interface RawPublishConfig {
	readonly access?: "public" | "restricted";
	readonly registry?: string;
	readonly directory?: string;
	readonly targets?: ReadonlyArray<RawTarget>;
}

interface RawPackageJson {
	readonly name?: string;
	readonly version?: string;
	readonly private?: boolean;
	readonly publishConfig?: RawPublishConfig;
}

const DEFAULT_REGISTRY = "https://registry.npmjs.org/";

function readRawPackageJson(pkgPath: string): RawPackageJson | null {
	try {
		const file = join(pkgPath, "package.json");
		if (!existsSync(file)) return null;
		return JSON.parse(readFileSync(file, "utf8")) as RawPackageJson;
	} catch {
		return null;
	}
}

function resolveTargetAccess(
	target: RawTarget,
	parentAccess: "public" | "restricted" | undefined,
): "public" | "restricted" | undefined {
	if (typeof target === "string") return parentAccess;
	return target.access ?? parentAccess;
}

/**
 * Run the silk publishability rules against one raw package.json.
 *
 * @internal
 */
export function silkDetect(pkgName: string, raw: RawPackageJson): ReadonlyArray<PublishTarget> {
	if (raw.private !== true) {
		return [
			new PublishTarget({
				name: pkgName,
				registry: raw.publishConfig?.registry ?? DEFAULT_REGISTRY,
				directory: raw.publishConfig?.directory ?? ".",
				access: raw.publishConfig?.access ?? "public",
			}),
		];
	}

	const pc = raw.publishConfig;
	if (!pc) return [];

	if (pc.targets && pc.targets.length > 0) {
		const results: PublishTarget[] = [];
		for (const target of pc.targets) {
			const access = resolveTargetAccess(target, pc.access);
			if (access !== "public" && access !== "restricted") continue;
			const registry =
				typeof target === "string"
					? (pc.registry ?? DEFAULT_REGISTRY)
					: (target.registry ?? pc.registry ?? DEFAULT_REGISTRY);
			results.push(
				new PublishTarget({
					name: pkgName,
					registry,
					directory: pc.directory ?? ".",
					access,
				}),
			);
		}
		return results;
	}

	if (pc.access === "public" || pc.access === "restricted") {
		return [
			new PublishTarget({
				name: pkgName,
				registry: pc.registry ?? DEFAULT_REGISTRY,
				directory: pc.directory ?? ".",
				access: pc.access,
			}),
		];
	}

	return [];
}

/**
 * Layer override for {@link PublishabilityDetector} that applies the
 * silk-suite publishability rules described in the module header.
 *
 * @public
 */
export const SilkPublishabilityDetectorLive: Layer.Layer<PublishabilityDetector> = Layer.succeed(
	PublishabilityDetector,
	{
		detect: (pkg: WorkspacePackage): Effect.Effect<ReadonlyArray<PublishTarget>> =>
			Effect.sync(() => {
				const raw = readRawPackageJson(pkg.path);
				if (!raw) return [];
				return silkDetect(pkg.name, raw);
			}),
	},
);

/**
 * Compute the set of currently-publishable workspace package names.
 *
 * @remarks
 * Used by the `deps detect` and `deps regen` commands to filter out
 * workspace packages whose dep changes would never reach a npm release
 * (the root `changesets` private workspace is the canonical example).
 *
 * Uses the currently-active {@link PublishabilityDetector} — wire the
 * {@link SilkPublishabilityDetectorLive} layer to get silk semantics.
 *
 * @public
 */
export function listPublishablePackageNames(
	packages: ReadonlyArray<WorkspacePackage>,
): Effect.Effect<ReadonlySet<string>, never, PublishabilityDetector> {
	return Effect.gen(function* () {
		const detector = yield* PublishabilityDetector;
		const names = new Set<string>();
		for (const pkg of packages) {
			const targets = yield* detector.detect(pkg, pkg.path);
			if (targets.length > 0) names.add(pkg.name);
		}
		return names;
	});
}
