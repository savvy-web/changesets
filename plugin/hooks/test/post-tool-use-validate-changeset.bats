#!/usr/bin/env bats
# tests/post-tool-use-validate-changeset.bats — PostToolUse validation hook.
#
# The hook fails open when savvy-changesets CLI is not on PATH, which is the
# situation under BATS — so the happy path for a changeset file write resolves
# to a no-op, not a validation invocation. To exercise the validation branch
# we shim a fake `npx`/`pnpm` on PATH that returns a non-zero exit code.

load 'test_helper'

setup() {
	setup_test_home
	unset_changesets_env
	export CLAUDE_PROJECT_DIR="$BATS_TEST_HOME/project"
	mkdir -p "$CLAUDE_PROJECT_DIR/.changeset"
	export CLAUDE_PLUGIN_ROOT="$PLUGIN_ROOT"
}

teardown() {
	teardown_test_home
}

@test "no-op for non-changeset files" {
	run bash -c "cat '$FIXTURES_DIR/posttooluse.non-changeset.json' | \
	             '$HOOKS_DIR/post-tool-use/validate-changeset.sh'"
	[ "$status" -eq 0 ]
	[ "$output" = "{}" ]
}

@test "no-op when tool_input.file_path is absent" {
	run bash -c "cat '$FIXTURES_DIR/posttooluse.no-file-path.json' | \
	             '$HOOKS_DIR/post-tool-use/validate-changeset.sh'"
	[ "$status" -eq 0 ]
	[ "$output" = "{}" ]
}

@test "no-op for .changeset/README.md" {
	run bash -c "cat '$FIXTURES_DIR/posttooluse.changeset-readme.json' | \
	             '$HOOKS_DIR/post-tool-use/validate-changeset.sh'"
	[ "$status" -eq 0 ]
	[ "$output" = "{}" ]
}

@test "no-op when CLI is not installed (fail-open)" {
	# Shim every package manager and npx to exit non-zero on `--version`,
	# simulating a host where savvy-changesets is not available. Without
	# the shim, a globally-installed CLI on the developer's machine would
	# poison this test.
	local shim_dir="$BATS_TEST_HOME/no-cli-shim"
	mkdir -p "$shim_dir"
	for bin in npx pnpm yarn bun bunx npm; do
		cat >"$shim_dir/$bin" <<'SHIM'
#!/usr/bin/env bash
exit 127
SHIM
		chmod +x "$shim_dir/$bin"
	done

	run env PATH="$shim_dir:$(dirname "$(command -v jq)"):/usr/bin:/bin" bash -c "
		cat '$FIXTURES_DIR/posttooluse.changeset-write.json' |
		'$HOOKS_DIR/post-tool-use/validate-changeset.sh'"
	[ "$status" -eq 0 ]
	[ "$output" = "{}" ]
}

@test "emits additionalContext when validation fails (shimmed CLI)" {
	local shim_dir="$BATS_TEST_HOME/shim"
	mkdir -p "$shim_dir"

	# Shim `npx` to behave like `savvy-changesets`: succeeds on --version,
	# emits a fake error and exits 1 on validate-file.
	cat >"$shim_dir/npx" <<'SHIM'
#!/usr/bin/env bash
set -e
for arg in "$@"; do
	case "$arg" in
		--version) echo "fake-savvy-changesets 0.0.0"; exit 0 ;;
		validate-file) echo "CSH002: unknown heading 'Whatever'" >&2; exit 1 ;;
	esac
done
exit 0
SHIM
	chmod +x "$shim_dir/npx"

	export CHANGESETS_PACKAGE_MANAGER=npm
	run env PATH="$shim_dir:/usr/bin:/bin" bash -c "
		cat '$FIXTURES_DIR/posttooluse.changeset-write.json' |
		'$HOOKS_DIR/post-tool-use/validate-changeset.sh'"
	[ "$status" -eq 0 ]
	[ "$(jq -r '.hookSpecificOutput.hookEventName' <<< "$output")" = "PostToolUse" ]
	local ctx
	ctx="$(jq -r '.hookSpecificOutput.additionalContext' <<< "$output")"
	[[ "$ctx" == *"validation found issues"* ]]
	[[ "$ctx" == *"CSH002"* ]]
}
