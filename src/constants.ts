/** Base URL for rule documentation on GitHub. */
const DOCS_BASE = "https://github.com/savvy-web/changesets/blob/main/docs/rules";

/** Documentation URLs for each changeset lint rule. */
export const RULE_DOCS = {
	CSH001: `${DOCS_BASE}/CSH001.md`,
	CSH002: `${DOCS_BASE}/CSH002.md`,
	CSH003: `${DOCS_BASE}/CSH003.md`,
	CSH004: `${DOCS_BASE}/CSH004.md`,
} as const;
