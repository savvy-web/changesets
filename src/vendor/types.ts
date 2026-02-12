/**
 * Vendor type re-exports with stricter typing.
 *
 * Re-exports key types from \@changesets/types with narrower signatures
 * used throughout \@savvy-web/changesets.
 *
 * Includes types derived from \@changesets/types (MIT license).
 *
 */

export type {
	ChangelogFunctions,
	ModCompWithPackage,
	NewChangesetWithCommit,
	VersionType,
} from "@changesets/types";
