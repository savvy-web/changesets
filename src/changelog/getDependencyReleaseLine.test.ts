import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";

import type { ChangesetOptions } from "../schemas/options.js";
import { makeGitHubTest } from "../services/github.js";
import type { GitHubCommitInfo } from "../vendor/github-info.js";
import type { ModCompWithPackage, NewChangesetWithCommit } from "../vendor/types.js";
import { getDependencyReleaseLine } from "./getDependencyReleaseLine.js";

const OPTIONS: ChangesetOptions = { repo: "owner/repo" };

const MOCK_INFO_A: GitHubCommitInfo = {
	user: "alice",
	pull: 10,
	links: {
		commit: "[`abc1234`](https://github.com/owner/repo/commit/abc1234567890)",
		pull: "https://github.com/owner/repo/pull/10",
		user: "https://github.com/alice",
	},
};

const MOCK_INFO_B: GitHubCommitInfo = {
	user: "bob",
	pull: 11,
	links: {
		commit: "[`def4567`](https://github.com/owner/repo/commit/def4567890abc)",
		pull: "https://github.com/owner/repo/pull/11",
		user: "https://github.com/bob",
	},
};

const testLayer = makeGitHubTest(
	new Map([
		["abc1234567890", MOCK_INFO_A],
		["def4567890abc", MOCK_INFO_B],
	]),
);

function makeDep(name: string, newVersion: string): ModCompWithPackage {
	return {
		name,
		type: "patch",
		oldVersion: "1.0.0",
		newVersion,
		changesets: [],
		packageJson: { name, version: newVersion },
		dir: `/packages/${name}`,
	};
}

describe("getDependencyReleaseLine", () => {
	it("returns empty string when no dependencies updated", async () => {
		const changesets: NewChangesetWithCommit[] = [
			{ id: "cs-1", summary: "bump", releases: [], commit: "abc1234567890" },
		];
		const result = await Effect.runPromise(
			getDependencyReleaseLine(changesets, [], OPTIONS).pipe(Effect.provide(testLayer)),
		);
		expect(result).toBe("");
	});

	it("generates dependency lines with commit links", async () => {
		const changesets: NewChangesetWithCommit[] = [
			{ id: "cs-1", summary: "bump deps", releases: [], commit: "abc1234567890" },
			{ id: "cs-2", summary: "bump more", releases: [], commit: "def4567890abc" },
		];
		const deps = [makeDep("@types/node", "20.0.0"), makeDep("typescript", "5.0.0")];

		const result = await Effect.runPromise(
			getDependencyReleaseLine(changesets, deps, OPTIONS).pipe(Effect.provide(testLayer)),
		);

		expect(result).toContain("Updated dependencies");
		expect(result).toContain("abc1234");
		expect(result).toContain("def4567");
		expect(result).toContain("@types/node@20.0.0");
		expect(result).toContain("typescript@5.0.0");
	});

	it("handles API failure with fallback links", async () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const failLayer = makeGitHubTest(new Map());
		const changesets: NewChangesetWithCommit[] = [
			{ id: "cs-1", summary: "bump", releases: [], commit: "deadbeef1234567" },
		];
		const deps = [makeDep("some-pkg", "2.0.0")];

		const result = await Effect.runPromise(
			getDependencyReleaseLine(changesets, deps, OPTIONS).pipe(Effect.provide(failLayer)),
		);

		expect(result).toContain("Updated dependencies");
		expect(result).toContain("deadbee");
		expect(result).toContain("some-pkg@2.0.0");
	});

	it("handles changesets without commits", async () => {
		const changesets: NewChangesetWithCommit[] = [{ id: "cs-1", summary: "bump", releases: [] }];
		const deps = [makeDep("some-pkg", "3.0.0")];

		const result = await Effect.runPromise(
			getDependencyReleaseLine(changesets, deps, OPTIONS).pipe(Effect.provide(testLayer)),
		);

		expect(result).toContain("Updated dependencies:");
		expect(result).toContain("some-pkg@3.0.0");
	});
});
