/**
 * Vendor type re-exports with stricter typing.
 *
 * Re-exports key types from \@changesets/types with narrower signatures
 * used throughout \@savvy-web/changesets.
 *
 * Includes types derived from \@changesets/types (MIT license).
 *
 * @packageDocumentation
 */

export type {
	ChangelogFunctions,
	GetDependencyReleaseLine,
	GetReleaseLine,
	ModCompWithPackage,
	NewChangesetWithCommit,
	VersionType,
} from "@changesets/types";
