#!/usr/bin/env bats
# tests/pre-tool-use-commit-reminder.bats — PreToolUse commit reminder hook.

load 'test_helper'

setup() {
	setup_test_home
	unset_changesets_env
}

teardown() {
	teardown_test_home
}

@test "emits PreToolUse additionalContext for git commit" {
	run bash -c "cat '$FIXTURES_DIR/pretooluse.git-commit.json' | \
	             '$HOOKS_DIR/pre-tool-use/commit-reminder.sh'"
	[ "$status" -eq 0 ]
	[ "$(jq -r '.hookSpecificOutput.hookEventName' <<< "$output")" = "PreToolUse" ]
	local ctx
	ctx="$(jq -r '.hookSpecificOutput.additionalContext' <<< "$output")"
	[[ "$ctx" == *"changeset"* ]]
}

@test "no-op for git push" {
	run bash -c "cat '$FIXTURES_DIR/pretooluse.git-push.json' | \
	             '$HOOKS_DIR/pre-tool-use/commit-reminder.sh'"
	[ "$status" -eq 0 ]
	[ "$output" = "{}" ]
}

@test "no-op when 'git commit' appears mid-string" {
	run bash -c "cat '$FIXTURES_DIR/pretooluse.commit-in-heredoc.json' | \
	             '$HOOKS_DIR/pre-tool-use/commit-reminder.sh'"
	[ "$status" -eq 0 ]
	[ "$output" = "{}" ]
}

@test "no-op when tool_input.command is absent" {
	run bash -c "cat '$FIXTURES_DIR/pretooluse.empty-command.json' | \
	             '$HOOKS_DIR/pre-tool-use/commit-reminder.sh'"
	[ "$status" -eq 0 ]
	[ "$output" = "{}" ]
}

@test "tolerates leading whitespace in command" {
	local fixture
	fixture=$(mktemp "$BATS_TEST_HOME/fixture.XXXXXX.json")
	cat >"$fixture" <<'JSON'
{
	"session_id": "test",
	"hook_event_name": "PreToolUse",
	"tool_name": "Bash",
	"tool_input": { "command": "   git commit -m 'thing'" }
}
JSON

	run bash -c "cat '$fixture' | '$HOOKS_DIR/pre-tool-use/commit-reminder.sh'"
	[ "$status" -eq 0 ]
	[ "$(jq -r '.hookSpecificOutput.hookEventName' <<< "$output")" = "PreToolUse" ]
}
