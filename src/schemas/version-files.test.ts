import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { JsonPathSchema, VersionFileConfigSchema, VersionFilesSchema } from "./version-files.js";

describe("JsonPathSchema", () => {
	const decode = Schema.decodeUnknownSync(JsonPathSchema);

	it("accepts valid JSONPath expressions", () => {
		expect(decode("$.version")).toBe("$.version");
		expect(decode("$.metadata.version")).toBe("$.metadata.version");
		expect(decode("$.plugins[*].version")).toBe("$.plugins[*].version");
		expect(decode("$.plugins[0].version")).toBe("$.plugins[0].version");
	});

	it("rejects paths not starting with $.", () => {
		expect(() => decode("version")).toThrow();
		expect(() => decode(".version")).toThrow();
		expect(() => decode("$version")).toThrow();
	});

	it("rejects non-string values", () => {
		expect(() => decode(123)).toThrow();
		expect(() => decode(null)).toThrow();
	});
});

describe("VersionFileConfigSchema", () => {
	const decode = Schema.decodeUnknownSync(VersionFileConfigSchema);

	it("accepts config with glob and paths", () => {
		const result = decode({
			glob: "plugin.json",
			paths: ["$.version"],
		});
		expect(result.glob).toBe("plugin.json");
		expect(result.paths).toEqual(["$.version"]);
	});

	it("accepts config with glob only (paths optional)", () => {
		const result = decode({ glob: "plugin.json" });
		expect(result.glob).toBe("plugin.json");
		expect(result.paths).toBeUndefined();
	});

	it("accepts config with multiple paths", () => {
		const result = decode({
			glob: ".claude-plugin/marketplace.json",
			paths: ["$.metadata.version", "$.plugins[*].version"],
		});
		expect(result.paths).toHaveLength(2);
	});

	it("rejects empty glob", () => {
		expect(() => decode({ glob: "" })).toThrow();
	});

	it("rejects invalid JSONPath in paths", () => {
		expect(() => decode({ glob: "plugin.json", paths: ["invalid"] })).toThrow();
	});

	it("rejects missing glob", () => {
		expect(() => decode({ paths: ["$.version"] })).toThrow();
	});
});

describe("VersionFilesSchema", () => {
	const decode = Schema.decodeUnknownSync(VersionFilesSchema);

	it("accepts an array of version file configs", () => {
		const result = decode([{ glob: "plugin.json", paths: ["$.version"] }, { glob: "**/manifest.json" }]);
		expect(result).toHaveLength(2);
	});

	it("accepts an empty array", () => {
		const result = decode([]);
		expect(result).toHaveLength(0);
	});

	it("rejects non-array input", () => {
		expect(() => decode("not an array")).toThrow();
		expect(() => decode({ glob: "plugin.json" })).toThrow();
	});
});
