/**
 * Schemas for the `versionFiles` configuration option.
 *
 * @remarks
 * The `versionFiles` option allows \@savvy-web/changesets to update version
 * fields in arbitrary JSON files (beyond `package.json`) during the
 * `changeset version` command. Each entry specifies a glob pattern to
 * match files and optional JSONPath expressions to locate version fields
 * within those files.
 *
 * @see {@link ChangesetOptionsSchema} where `versionFiles` is consumed
 * @see {@link https://effect.website/docs/schema/introduction | Effect Schema documentation}
 *
 * @packageDocumentation
 */

import { Schema } from "effect";

/**
 * Schema for a JSONPath expression starting with `$.`.
 *
 * @remarks
 * Supports property access (`$.foo.bar`), array wildcard (`$.foo[*].bar`),
 * and array index access (`$.foo[0].bar`). The expression must begin with
 * `$.` followed by at least one property segment.
 *
 * @example
 * ```typescript
 * import { Schema } from "effect";
 * import { JsonPathSchema } from "@savvy-web/changesets";
 *
 * // Succeeds — simple property access
 * Schema.decodeUnknownSync(JsonPathSchema)("$.version");
 *
 * // Succeeds — nested property access
 * Schema.decodeUnknownSync(JsonPathSchema)("$.metadata.version");
 *
 * // Throws ParseError — missing "$." prefix
 * Schema.decodeUnknownSync(JsonPathSchema)("version");
 * ```
 *
 * @see {@link VersionFileConfigSchema} which uses this for the `paths` field
 *
 * @public
 */
export const JsonPathSchema = Schema.String.pipe(
	Schema.pattern(/^\$\.[^.]/, {
		message: () => 'JSONPath must start with "$." followed by a property (e.g., "$.version", "$.metadata.version")',
	}),
);

/**
 * Schema for a single version file configuration entry.
 *
 * @remarks
 * Each entry specifies a glob pattern that matches one or more JSON files
 * and an optional array of JSONPath expressions indicating which fields
 * within those files contain version numbers. When `paths` is omitted,
 * it defaults to `["$.version"]` at runtime.
 *
 * @example
 * ```typescript
 * import { Schema } from "effect";
 * import { VersionFileConfigSchema } from "@savvy-web/changesets";
 * import type { VersionFileConfig } from "@savvy-web/changesets";
 *
 * const config: VersionFileConfig = Schema.decodeUnknownSync(VersionFileConfigSchema)({
 * 	glob: "manifest.json",
 * 	paths: ["$.version", "$.metadata.version"],
 * });
 *
 * // Paths are optional — defaults to ["$.version"] at runtime
 * const simpleConfig: VersionFileConfig = Schema.decodeUnknownSync(VersionFileConfigSchema)({
 * 	glob: "**\/deno.json",
 * });
 * ```
 *
 * @see {@link VersionFileConfig} for the inferred TypeScript type
 * @see {@link VersionFilesSchema} for the array of entries
 * @see {@link JsonPathSchema} for JSONPath validation rules
 *
 * @public
 */
export const VersionFileConfigSchema = Schema.Struct({
	/** Glob pattern to match JSON files. */
	glob: Schema.String.pipe(Schema.minLength(1)),
	/** JSONPath expressions to locate version fields. Defaults to `["$.version"]`. */
	paths: Schema.optional(Schema.Array(JsonPathSchema)),
	/** Workspace package name to source the version from, bypassing path-based resolution. */
	package: Schema.optional(Schema.String.pipe(Schema.minLength(1))),
});

/**
 * Inferred type for {@link VersionFileConfigSchema}.
 *
 * @public
 */
export interface VersionFileConfig extends Schema.Schema.Type<typeof VersionFileConfigSchema> {}

/**
 * Schema for the `versionFiles` array.
 *
 * @remarks
 * An array of {@link VersionFileConfigSchema} entries. Each entry targets
 * a set of JSON files via glob and specifies which JSONPath expressions
 * point to version fields that should be updated.
 *
 * @example
 * ```typescript
 * import { Schema } from "effect";
 * import { VersionFilesSchema } from "@savvy-web/changesets";
 *
 * const versionFiles = Schema.decodeUnknownSync(VersionFilesSchema)([
 * 	{ glob: "manifest.json", paths: ["$.version"] },
 * 	{ glob: "deno.json" },
 * ]);
 * ```
 *
 * @see {@link ChangesetOptionsSchema} where this is used as an optional field
 *
 * @public
 */
export const VersionFilesSchema = Schema.Array(VersionFileConfigSchema);
