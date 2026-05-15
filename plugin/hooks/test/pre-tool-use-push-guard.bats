#!/usr/bin/env bats
# pre-tool-use-push-guard.bats — PreToolUse guard that blocks `git push`
# from a feature branch when the diff has no changeset.

load 'test_helper'

# Build a throwaway git repo with `main` and a feature branch checked out.
# Tests then layer commits / changesets on top before invoking the hook.
setup() {
	setup_test_home
	unset_changesets_env
	unset CHANGESETS_SKIP_PUSH_CHECK

	REPO_DIR="$(mktemp -d "${TMPDIR:-/tmp}/changesets-bats-repo.XXXXXX")"
	(
		cd "$REPO_DIR"
		git init -q -b main
		git config user.email "test@example.com"
		git config user.name "Test"
		git config commit.gpgsign false
		git config tag.gpgsign false
		mkdir -p .changeset
		printf 'README placeholder\n' >.changeset/README.md
		git add .
		git commit -q -m "initial"
		git checkout -q -b feature
	)
	export CHANGESETS_PROJECT_DIR="$REPO_DIR"
}

teardown() {
	teardown_test_home
	if [ -n "${REPO_DIR:-}" ] && [ -d "$REPO_DIR" ]; then
		rm -rf "$REPO_DIR"
	fi
	unset CHANGESETS_PROJECT_DIR CHANGESETS_SKIP_PUSH_CHECK
}

# Helper: stage a non-changeset commit on the current branch.
_commit_code_only() {
	(
		cd "$REPO_DIR"
		echo "x" >>file.txt
		git add file.txt
		git commit -q -m "feat: change"
	)
}

# Helper: write a changeset file on the current branch.
_commit_with_changeset() {
	(
		cd "$REPO_DIR"
		echo "y" >>file.txt
		cat >.changeset/funny-name.md <<'MD'
---
"foo": minor
---

## Features

- bar
MD
		git add .
		git commit -q -m "feat: change with changeset"
	)
}

# Helper: build a fixture JSON envelope with a specific Bash command.
_fixture_with_command() {
	local cmd="$1"
	local fixture
	fixture=$(mktemp "$BATS_TEST_HOME/fixture.XXXXXX.json")
	jq -n --arg cmd "$cmd" '{
		session_id: "test-session-0001",
		hook_event_name: "PreToolUse",
		tool_name: "Bash",
		tool_input: { command: $cmd }
	}' >"$fixture"
	printf '%s' "$fixture"
}

@test "blocks git push on feature branch with no changeset" {
	_commit_code_only

	run bash -c "cat '$FIXTURES_DIR/pretooluse.git-push.json' | bash '$HOOKS_DIR/pre-tool-use/push-guard.sh'"

	[ "$status" -eq 0 ]
	[ "$(jq -r '.hookSpecificOutput.hookEventName' <<< "$output")" = "PreToolUse" ]
	[ "$(jq -r '.hookSpecificOutput.permissionDecision' <<< "$output")" = "deny" ]
	local reason
	reason="$(jq -r '.hookSpecificOutput.permissionDecisionReason' <<< "$output")"
	[[ "$reason" == *"CHANGESETS_SKIP_PUSH_CHECK"* ]]
	[[ "$reason" == *"feature"* ]]
	[[ "$reason" == *"changeset"* ]]
}

@test "allows git push with inline CHANGESETS_SKIP_PUSH_CHECK=1 override" {
	_commit_code_only
	local fixture
	fixture="$(_fixture_with_command "CHANGESETS_SKIP_PUSH_CHECK=1 git push origin feature")"

	run bash -c "cat '$fixture' | bash '$HOOKS_DIR/pre-tool-use/push-guard.sh'"

	[ "$status" -eq 0 ]
	[ "$output" = "{}" ]
}

@test "allows git push with env CHANGESETS_SKIP_PUSH_CHECK=1 prefix" {
	_commit_code_only
	local fixture
	fixture="$(_fixture_with_command "env CHANGESETS_SKIP_PUSH_CHECK=1 git push origin feature")"

	run bash -c "cat '$fixture' | bash '$HOOKS_DIR/pre-tool-use/push-guard.sh'"

	[ "$status" -eq 0 ]
	[ "$output" = "{}" ]
}

@test "blocks env git push when override is missing" {
	_commit_code_only
	local fixture
	fixture="$(_fixture_with_command "env git push origin feature")"

	run bash -c "cat '$fixture' | bash '$HOOKS_DIR/pre-tool-use/push-guard.sh'"

	[ "$status" -eq 0 ]
	[ "$(jq -r '.hookSpecificOutput.permissionDecision' <<< "$output")" = "deny" ]
}

@test "allows git push with quoted inline override value" {
	_commit_code_only
	local fixture
	fixture="$(_fixture_with_command "CHANGESETS_SKIP_PUSH_CHECK=\"true\" git push origin feature")"

	run bash -c "cat '$fixture' | bash '$HOOKS_DIR/pre-tool-use/push-guard.sh'"

	[ "$status" -eq 0 ]
	[ "$output" = "{}" ]
}

@test "allows git push with session-level CHANGESETS_SKIP_PUSH_CHECK env" {
	_commit_code_only

	run bash -c "CHANGESETS_SKIP_PUSH_CHECK=1 cat '$FIXTURES_DIR/pretooluse.git-push.json' | CHANGESETS_SKIP_PUSH_CHECK=1 CHANGESETS_PROJECT_DIR='$REPO_DIR' bash '$HOOKS_DIR/pre-tool-use/push-guard.sh'"

	[ "$status" -eq 0 ]
	[ "$output" = "{}" ]
}

@test "allows git push when branch contains a changeset" {
	_commit_with_changeset

	run bash -c "cat '$FIXTURES_DIR/pretooluse.git-push.json' | bash '$HOOKS_DIR/pre-tool-use/push-guard.sh'"

	[ "$status" -eq 0 ]
	[ "$output" = "{}" ]
}

@test "no-op on main branch" {
	(cd "$REPO_DIR" && git checkout -q main)

	run bash -c "cat '$FIXTURES_DIR/pretooluse.git-push.json' | bash '$HOOKS_DIR/pre-tool-use/push-guard.sh'"

	[ "$status" -eq 0 ]
	[ "$output" = "{}" ]
}

@test "no-op on a release/* branch" {
	(cd "$REPO_DIR" && git checkout -q -b release/0.10.0)
	_commit_code_only

	run bash -c "cat '$FIXTURES_DIR/pretooluse.git-push.json' | bash '$HOOKS_DIR/pre-tool-use/push-guard.sh'"

	[ "$status" -eq 0 ]
	[ "$output" = "{}" ]
}

@test "no-op on a changeset-release/* branch" {
	(cd "$REPO_DIR" && git checkout -q -b changeset-release/main)
	_commit_code_only

	run bash -c "cat '$FIXTURES_DIR/pretooluse.git-push.json' | bash '$HOOKS_DIR/pre-tool-use/push-guard.sh'"

	[ "$status" -eq 0 ]
	[ "$output" = "{}" ]
}

@test "no-op on a dependabot/* branch" {
	(cd "$REPO_DIR" && git checkout -q -b dependabot/npm_and_yarn/foo-1.2.3)
	_commit_code_only

	run bash -c "cat '$FIXTURES_DIR/pretooluse.git-push.json' | bash '$HOOKS_DIR/pre-tool-use/push-guard.sh'"

	[ "$status" -eq 0 ]
	[ "$output" = "{}" ]
}

@test "no-op on a renovate/* branch" {
	(cd "$REPO_DIR" && git checkout -q -b renovate/lodash-4.x)
	_commit_code_only

	run bash -c "cat '$FIXTURES_DIR/pretooluse.git-push.json' | bash '$HOOKS_DIR/pre-tool-use/push-guard.sh'"

	[ "$status" -eq 0 ]
	[ "$output" = "{}" ]
}

@test "no-op on a renovate-* (hyphen-prefix) branch" {
	(cd "$REPO_DIR" && git checkout -q -b renovate-fix-lodash)
	_commit_code_only

	run bash -c "cat '$FIXTURES_DIR/pretooluse.git-push.json' | bash '$HOOKS_DIR/pre-tool-use/push-guard.sh'"

	[ "$status" -eq 0 ]
	[ "$output" = "{}" ]
}

@test "no-op for non-push git commands" {
	_commit_code_only

	run bash -c "cat '$FIXTURES_DIR/pretooluse.git-commit.json' | bash '$HOOKS_DIR/pre-tool-use/push-guard.sh'"

	[ "$status" -eq 0 ]
	[ "$output" = "{}" ]
}

@test "no-op when 'git push' appears inside a heredoc string" {
	_commit_code_only
	local fixture
	fixture="$(_fixture_with_command "echo 'do not git push yet'")"

	run bash -c "cat '$fixture' | bash '$HOOKS_DIR/pre-tool-use/push-guard.sh'"

	[ "$status" -eq 0 ]
	[ "$output" = "{}" ]
}

@test "no-op when tool_input.command is absent" {
	run bash -c "cat '$FIXTURES_DIR/pretooluse.empty-command.json' | bash '$HOOKS_DIR/pre-tool-use/push-guard.sh'"

	[ "$status" -eq 0 ]
	[ "$output" = "{}" ]
}

@test "no-op when project dir is not a git repo" {
	local nonrepo
	nonrepo="$(mktemp -d "${TMPDIR:-/tmp}/changesets-bats-nonrepo.XXXXXX")"

	run bash -c "cat '$FIXTURES_DIR/pretooluse.git-push.json' | CHANGESETS_PROJECT_DIR='$nonrepo' bash '$HOOKS_DIR/pre-tool-use/push-guard.sh'"

	[ "$status" -eq 0 ]
	[ "$output" = "{}" ]
	rm -rf "$nonrepo"
}

@test "tolerates leading whitespace before git push" {
	_commit_code_only
	local fixture
	fixture="$(_fixture_with_command "   git push origin feature")"

	run bash -c "cat '$fixture' | bash '$HOOKS_DIR/pre-tool-use/push-guard.sh'"

	[ "$status" -eq 0 ]
	[ "$(jq -r '.hookSpecificOutput.permissionDecision' <<< "$output")" = "deny" ]
}

@test "deny reason echoes the original command for retry" {
	_commit_code_only
	local original="git push origin feature"
	local fixture
	fixture="$(_fixture_with_command "$original")"

	run bash -c "cat '$fixture' | bash '$HOOKS_DIR/pre-tool-use/push-guard.sh'"

	[ "$status" -eq 0 ]
	local reason
	reason="$(jq -r '.hookSpecificOutput.permissionDecisionReason' <<< "$output")"
	[[ "$reason" == *"CHANGESETS_SKIP_PUSH_CHECK=1 $original"* ]]
}
