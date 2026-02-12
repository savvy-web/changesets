import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { GitHubApiError } from "../errors.js";
import type { GitHubCommitInfo } from "../vendor/github-info.js";
import { GitHubService, makeGitHubTest } from "./github.js";

const MOCK_INFO: GitHubCommitInfo = {
	user: "octocat",
	pull: 42,
	links: {
		commit: "[`abc1234`](https://github.com/owner/repo/commit/abc1234)",
		pull: "[#42](https://github.com/owner/repo/pull/42)",
		user: "[@octocat](https://github.com/octocat)",
	},
};

describe("GitHubService (test layer)", () => {
	const testLayer = makeGitHubTest(new Map([["abc1234567890", MOCK_INFO]]));

	it("returns configured response for known commit", async () => {
		const program = Effect.gen(function* () {
			const github = yield* GitHubService;
			return yield* github.getInfo({ commit: "abc1234567890", repo: "owner/repo" });
		});

		const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer)));
		expect(result.user).toBe("octocat");
		expect(result.pull).toBe(42);
		expect(result.links.commit).toContain("abc1234");
	});

	it("fails with GitHubApiError for unknown commit", async () => {
		const program = Effect.gen(function* () {
			const github = yield* GitHubService;
			return yield* github.getInfo({ commit: "unknown", repo: "owner/repo" });
		});

		const result = await Effect.runPromise(program.pipe(Effect.provide(testLayer), Effect.flip));
		expect(result).toBeInstanceOf(GitHubApiError);
		expect(result._tag).toBe("GitHubApiError");
		expect(result.reason).toContain("unknown");
	});

	it("provides correct operation field on error", async () => {
		const program = Effect.gen(function* () {
			const github = yield* GitHubService;
			return yield* github.getInfo({ commit: "missing", repo: "owner/repo" });
		});

		const error = await Effect.runPromise(program.pipe(Effect.provide(testLayer), Effect.flip));
		expect(error.operation).toBe("getInfo");
	});
});
