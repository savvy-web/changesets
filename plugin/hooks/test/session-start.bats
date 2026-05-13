#!/usr/bin/env bats
# tests/session-start.bats — env-export hook for the SessionStart event.

load 'test_helper'

setup() {
	setup_test_home
	unset_changesets_env
	export CLAUDE_PROJECT_DIR="$BATS_TEST_HOME/project"
	mkdir -p "$CLAUDE_PROJECT_DIR"
	export CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT"
	export CLAUDE_PLUGIN_DATA="$BATS_TEST_HOME/plugin-data"
	mkdir -p "$CLAUDE_PLUGIN_DATA"
}

teardown() {
	teardown_test_home
}

@test "emits hookSpecificOutput with SessionStart event name" {
	run bash -c "cat '$FIXTURES_DIR/sessionstart.basic.json' | \
	             '$HOOKS_DIR/session-start/env-export.sh'"
	[ "$status" -eq 0 ]
	[ "$(jq -r '.hookSpecificOutput.hookEventName' <<< "$output")" = "SessionStart" ]
}

@test "additionalContext points to the style skill, not the full rules" {
	run bash -c "cat '$FIXTURES_DIR/sessionstart.basic.json' | \
	             '$HOOKS_DIR/session-start/env-export.sh'"
	[ "$status" -eq 0 ]
	local ctx
	ctx="$(jq -r '.hookSpecificOutput.additionalContext' <<< "$output")"
	[[ "$ctx" == *"changesets_plugin"* ]]
	[[ "$ctx" == *"/changesets:style"* ]]
	# Style rule details should NOT be inlined — that would defeat the
	# point of moving them into the path-triggered skill. A passing mention
	# like "CSH001–CSH005" describing what the skill contains is fine.
	[[ "$ctx" != *"Breaking Changes, Features, Bug Fixes"* ]]
	[[ "$ctx" != *"bump_type_guidelines"* ]]
	[[ "$ctx" != *"Hybrid Transformation Pipeline"* ]]
}

@test "persists CHANGESETS_PROJECT_DIR to per-session env file" {
	run bash -c "cat '$FIXTURES_DIR/sessionstart.basic.json' | \
	             '$HOOKS_DIR/session-start/env-export.sh'"
	[ "$status" -eq 0 ]
	local env_file="$HOME/.claude/session-env/test-session-0001/changesets-hook.sh"
	[ -f "$env_file" ]
	grep -q '^export CHANGESETS_PROJECT_DIR=' "$env_file"
	grep -q '^export CHANGESETS_PACKAGE_MANAGER=' "$env_file"
}

@test "writes CHANGESETS_ exports to CLAUDE_ENV_FILE when set" {
	local env_file
	env_file="$BATS_TEST_HOME/claude-env.sh"
	: > "$env_file"
	export CLAUDE_ENV_FILE="$env_file"

	run bash -c "cat '$FIXTURES_DIR/sessionstart.basic.json' | \
	             '$HOOKS_DIR/session-start/env-export.sh'"
	[ "$status" -eq 0 ]
	grep -q '^export CHANGESETS_PROJECT_DIR=' "$env_file"
	grep -q '^export CHANGESETS_PLUGIN_ROOT=' "$env_file"
}

@test "detects pnpm package manager from pnpm-lock.yaml" {
	: > "$CLAUDE_PROJECT_DIR/pnpm-lock.yaml"

	run bash -c "cat '$FIXTURES_DIR/sessionstart.basic.json' | \
	             '$HOOKS_DIR/session-start/env-export.sh'"
	[ "$status" -eq 0 ]
	local env_file="$HOME/.claude/session-env/test-session-0001/changesets-hook.sh"
	grep -q '^export CHANGESETS_PACKAGE_MANAGER=pnpm$' "$env_file"
}

@test "fails open if CLAUDE_PROJECT_DIR is unset (uses envelope cwd)" {
	unset CLAUDE_PROJECT_DIR
	run bash -c "cat '$FIXTURES_DIR/sessionstart.basic.json' | \
	             '$HOOKS_DIR/session-start/env-export.sh'"
	[ "$status" -eq 0 ]
}
