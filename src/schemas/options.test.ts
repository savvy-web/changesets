import { Effect, Schema } from "effect";
import { describe, expect, it } from "vitest";

import { ConfigurationError } from "../errors.js";
import { ChangesetOptionsSchema, RepoSchema, validateChangesetOptions } from "./options.js";

describe("RepoSchema", () => {
	const decode = Schema.decodeUnknownSync(RepoSchema);

	it("accepts valid repo formats", () => {
		expect(decode("microsoft/vscode")).toBe("microsoft/vscode");
		expect(decode("facebook/react")).toBe("facebook/react");
		expect(decode("user-123/my_project")).toBe("user-123/my_project");
		expect(decode("a.b/c.d")).toBe("a.b/c.d");
	});

	it("rejects missing slash", () => {
		expect(() => decode("invalid")).toThrow();
	});

	it("rejects missing owner", () => {
		expect(() => decode("/repository")).toThrow();
	});

	it("rejects missing repository", () => {
		expect(() => decode("owner/")).toThrow();
	});
});

describe("ChangesetOptionsSchema", () => {
	const decode = Schema.decodeUnknownSync(ChangesetOptionsSchema);

	it("accepts minimal valid options", () => {
		const opts = decode({ repo: "owner/repo" });
		expect(opts.repo).toBe("owner/repo");
	});

	it("accepts extended options", () => {
		const opts = decode({
			repo: "owner/repo",
			commitLinks: true,
			prLinks: false,
			issueLinks: true,
			issuePrefixes: ["#", "GH-"],
		});
		expect(opts.commitLinks).toBe(true);
		expect(opts.prLinks).toBe(false);
		expect(opts.issuePrefixes).toEqual(["#", "GH-"]);
	});

	it("rejects missing repo", () => {
		expect(() => decode({})).toThrow();
	});
});

describe("validateChangesetOptions", () => {
	const run = (input: unknown) => Effect.runSync(validateChangesetOptions(input));
	const runFail = (input: unknown) => Effect.runSync(validateChangesetOptions(input).pipe(Effect.flip));

	it("succeeds with valid options", () => {
		const opts = run({ repo: "owner/repo" });
		expect(opts.repo).toBe("owner/repo");
	});

	it("succeeds with extended options", () => {
		const opts = run({ repo: "owner/repo", commitLinks: true });
		expect(opts.commitLinks).toBe(true);
	});

	it("fails on null input", () => {
		const err = runFail(null);
		expect(err).toBeInstanceOf(ConfigurationError);
		expect(err.field).toBe("options");
		expect(err.reason).toContain("Configuration is required");
	});

	it("fails on undefined input", () => {
		const err = runFail(undefined);
		expect(err.field).toBe("options");
	});

	it("fails on non-object input", () => {
		const err = runFail("not an object");
		expect(err.reason).toContain("must be an object");
	});

	it("fails on missing repo", () => {
		const err = runFail({});
		expect(err.field).toBe("repo");
		expect(err.reason).toContain("Repository name is required");
	});

	it("fails on invalid repo format", () => {
		const err = runFail({ repo: "invalid" });
		expect(err.field).toBe("repo");
		expect(err.reason).toContain("Invalid repository format");
	});

	it("preserves prior art error message for null", () => {
		const err = runFail(null);
		expect(err.reason).toContain("@savvy-web/changesets");
	});
});
