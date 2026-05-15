---
"@savvy-web/changesets": minor
---

## Features

### Push-guard hook

The plugin's `PreToolUse` hook on `Bash` now blocks `git push` from a feature branch when the diff against the default branch contains no `.changeset/*.md`, replacing the previous per-`git commit` reminder. The new hook fires once per push, gates the actual bad outcome (publishing without a changelog entry), and surfaces a deny reason that walks the caller through two paths: create a changeset, or override via `CHANGESETS_SKIP_PUSH_CHECK=1` for branches that genuinely don't need one (docs-only, internal refactor, dependency pin within range).

Three override forms are recognized:

- Inline shell assignment: `CHANGESETS_SKIP_PUSH_CHECK=1 git push ...`
- `env(1)` invocation form: `env CHANGESETS_SKIP_PUSH_CHECK=1 git push ...`
- Session-level export: `CHANGESETS_SKIP_PUSH_CHECK=1` in the environment that launched Claude Code

The guard fails open when the branch is `main` / `master` / `release/*` / `changeset-release/*` / `dependabot/*` / `renovate/*` / `renovate-*`, when no base ref is available, when HEAD is detached, when the cwd is not a git repo, or when the diff against the merge base already contains any added or modified changeset.

### Model-invocable changeset skills

`/changesets:create`, `/changesets:squash`, `/changesets:check`, `/changesets:list`, and `/changesets:preview` are now reachable by the main session Claude when intent matches their `when_to_use` triggers, and by the `changeset-manager` agent during its procedure. Previously the model could not autonomously dispatch them — users had to type the slash command explicitly even when the agent had already identified the next step.

## Bug Fixes

- Skill-bundled script paths now resolve via `${CLAUDE_PLUGIN_ROOT}/skills/<skill>/scripts/<name>.sh` on the `check`, `config`, `dependencies`, and `list` skills. The previous `${CLAUDE_SKILL_DIR}` form is a markdown-substitution variable rather than a subprocess env var, which made the path unreliable when scripts were invoked via the Bash tool rather than a `!` markdown-exec block.
- `allowed-tools: Bash` on the `check`, `list`, `config`, and `dependencies` skills was an unscoped grant. Narrowed to `Bash(bash *)` to match what each skill actually invokes.
