/**
 * Changesets API changelog formatter.
 *
 * This module exports the `ChangelogFunctions` required by the Changesets API.
 * Configure in `.changeset/config.json`:
 *
 * ```json
 * {
 *   "changelog": ["\@savvy-web/changesets/changelog", { "repo": "savvy-web/package-name" }]
 * }
 * ```
 *
 * @packageDocumentation
 */

// Placeholder interface until vendor types are implemented
interface ChangelogFunctions {
	getReleaseLine: (...args: Array<unknown>) => Promise<string>;
	getDependencyReleaseLine: (...args: Array<unknown>) => Promise<string>;
}

const changelogFunctions: ChangelogFunctions = {
	async getReleaseLine() {
		return "";
	},
	async getDependencyReleaseLine() {
		return "";
	},
};

export default changelogFunctions;
