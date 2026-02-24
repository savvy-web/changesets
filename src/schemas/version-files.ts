/**
 * Schemas for the `versionFiles` configuration option.
 *
 * @internal
 */

import { Schema } from "effect";

/**
 * Schema for a JSONPath expression starting with `$.`.
 *
 * Supports property access (`$.foo.bar`), array wildcard (`$.foo[*].bar`),
 * and array index access (`$.foo[0].bar`).
 */
export const JsonPathSchema = Schema.String.pipe(
	Schema.pattern(/^\$\./, {
		message: () => 'JSONPath must start with "$." (e.g., "$.version", "$.metadata.version")',
	}),
);

/**
 * Schema for a single version file configuration entry.
 */
export const VersionFileConfigSchema = Schema.Struct({
	/** Glob pattern to match JSON files. */
	glob: Schema.String.pipe(Schema.minLength(1)),
	/** JSONPath expressions to locate version fields. Defaults to `["$.version"]`. */
	paths: Schema.optional(Schema.Array(JsonPathSchema)),
});

/**
 * Inferred type for {@link VersionFileConfigSchema}.
 */
export interface VersionFileConfig extends Schema.Schema.Type<typeof VersionFileConfigSchema> {}

/**
 * Schema for the `versionFiles` array.
 */
export const VersionFilesSchema = Schema.Array(VersionFileConfigSchema);
