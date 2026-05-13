# test_helper.bash — shared BATS setup for changesets plugin hook tests.
#
# Establishes path constants used by every test file. Each test file should
# `load 'test_helper'` to pick these up.

HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_ROOT="$(cd "$HOOKS_DIR/.." && pwd)"
FIXTURES_DIR="$HOOKS_DIR/fixtures"

export HOOKS_DIR PLUGIN_ROOT FIXTURES_DIR

# Sandbox per-session env writes under a throwaway HOME so tests don't
# pollute the developer's real ~/.claude/session-env directory.
setup_test_home() {
	BATS_TEST_HOME="$(mktemp -d "${TMPDIR:-/tmp}/changesets-bats.XXXXXX")"
	export HOME="$BATS_TEST_HOME"
}

teardown_test_home() {
	if [ -n "${BATS_TEST_HOME:-}" ] && [ -d "$BATS_TEST_HOME" ]; then
		rm -rf "$BATS_TEST_HOME"
	fi
}

# Ensure namespaced exports do not leak between tests.
unset_changesets_env() {
	unset CHANGESETS_PROJECT_DIR CHANGESETS_DATA_DIR CHANGESETS_PLUGIN_ROOT \
	      CHANGESETS_SESSION_ID CHANGESETS_PACKAGE_MANAGER
}
