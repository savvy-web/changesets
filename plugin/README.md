# changesets plugin

Companion Claude Code plugin for [@savvy-web/changesets](https://github.com/savvy-web/changesets) that helps write well-structured changeset files for GitHub release documentation.

This plugin is versioned in lockstep with the npm package and ships the domain knowledge — format rules, valid section headings, content depth tiers — that Claude needs to draft useful changeset files without having to relearn the conventions every session.

## Installation

Install via the `savvy-web/systems` marketplace, or load directly from this repository.

## What it ships

### Hooks

| Event | Matcher | Purpose |
| --- | --- | --- |
| `SessionStart` | — | Injects the changeset format reference into the session context and persists `CHANGESETS_PROJECT_DIR` / `CHANGESETS_DATA_DIR` / `CHANGESETS_PLUGIN_ROOT` / `CHANGESETS_PACKAGE_MANAGER` for reader hooks. |
| `PreToolUse` | `Bash` | Blocks `git push` from a feature branch when no changeset is present in the diff against the default branch. Override per-invocation by prefixing `CHANGESETS_SKIP_PUSH_CHECK=1`. |
| `PostToolUse` | `Write\|Edit` | Validates `.changeset/*.md` files via the `savvy-changesets validate-file` CLI after a write. Fails open if the CLI is not installed. |

### Skills

The plugin is built around two user-facing actions — **create** and **squash** — that dispatch the `changeset-manager` agent. The agent owns discovery, classification, and the exclusion rules. A few read-only utilities and a style reference are also user-invokable directly.

User-invokable (`/changesets:<name>`):

| Skill | Arguments | Purpose |
| --- | --- | --- |
| `/changesets:create` | `[--require] [--package <name>] [--bump patch\|minor\|major] [--dry-run]` | Reconcile changesets with the branch's diff. Discovers existing entries, classifies the diff, applies exclusion rules, and decides whether to create / update / delete. `--require` asserts a changeset must exist; `--dry-run` prints the plan without writing. |
| `/changesets:squash` | `[branch\|all] [--package <name>] [--dry-run]` | Consolidate per-package changesets with identical bump mappings. Default scope `branch` covers only entries added since the merge base; `all` includes pre-existing entries. |
| `/changesets:check` | — | Validate existing changesets against CSH001–CSH005 rules. |
| `/changesets:list` | — | Summarize pending changesets: packages, bump types, content previews. |
| `/changesets:preview` | — | Render the combined CHANGELOG output the current set would produce. |
| `/changesets:style` | — | Full style and format specification. Also auto-loads on `.changeset/*.md` reads. |

Model-only (invoked by the `changeset-manager` agent):

| Skill | Purpose |
| --- | --- |
| `config` | Surfaces `.changeset/config.json` — especially the `versionFiles` extension that links non-workspace paths to package release surfaces. The agent invokes this during inventory so it correctly attributes changes to linked paths (e.g., a Claude Code plugin whose version tracks the npm package). |
| `update` | Mechanics for modifying an existing changeset (content, bump, packages) while preserving structural rules. |
| `merge` | Mechanics for consolidating two or more changesets with identical mappings. |
| `delete` | Mechanics for removing a stale changeset and reporting what was removed. |

Auto-loading (triggered by file paths):

| Skill | Trigger |
| --- | --- |
| `style` | Auto-loads when Claude reads `.changeset/*.md`. The authoritative style guide; also user-invokable as `/changesets:style`. |
| `status` | Auto-loads when Claude reads `.changeset/*.md`. Loads context about pending changesets to prevent duplicates. |

The SessionStart hook keeps its injected context intentionally short — a pointer to the `style` skill, the available slash commands, and a note that the `changeset-manager` agent handles the reconcile flow. Style rules auto-load when Claude actually reads a changeset file, so the SessionStart payload stays small and resists context rot in long sessions where the changeset work happens at the end.

### Agents

| Agent | When to use |
| --- | --- |
| `changeset-manager` | Autonomous changeset reconciliation. Operates in two modes — **create** (diff-driven discovery, classification, and write/update/delete) and **squash** (group by mapping, consolidate, retroactively apply exclusion rules). Invoked by `/changesets:create` and `/changesets:squash`; should also be delegated to directly when the main agent recognizes a changeset pass is needed. Scoped Bash access (`git`, `pnpm`, `yarn`, `bun`, `npm`, `npx`, `bunx`, `jq`, `cat`, `ls`, `find`). |

### Exclusion rules — what does NOT belong in a changeset

The `changeset-manager` agent applies these rules every run. They keep CHANGELOGs and release notes focused on what consumers care about.

- **AI context documents** — `CLAUDE.md`, `CLAUDE.local.md`, `AGENTS.md`, `AGENTS.local.md`, `.cursorrules`, and similar files that exist to coach AI tools.
- **Internal design docs and specs** — markdown under `.claude/design/`, `.claude/plans/`, `docs/internal/`, etc.
- **Trivial doc updates riding along with code** — when a code change updates a README snippet or example in the same diff, the changeset describes the code, not the doc edit. Substantial user-facing doc rewrites are the exception and belong under `## Documentation`.
- **Behavior-neutral config** — `.editorconfig`, lint/format toggles, IDE settings, CI matrix tweaks that don't change what's tested or built.
- **Routine churn** — dependency pin bumps within range, lockfile updates from `pnpm install`, upstream type definition updates.

If a branch contains *only* changes from these categories, no changeset is needed and the agent will report that rather than generating noise.

**Release surfaces are not inferred.** A "release surface" — a path whose changes belong in a package's CHANGELOG — is either (1) a workspace package directory listed in `pnpm-workspace.yaml`, or (2) a path declared in `.changeset/config.json`'s `versionFiles`. The agent invokes the `config` skill on every run to read `versionFiles` and will ask the user (rather than silently excluding) when a path is outside both. This is how, for example, changes to this very plugin directory get correctly attributed to `@savvy-web/changesets` — because the project's config declares `plugin/.claude-plugin/plugin.json` as a linked version file.

## Directory layout

```text
plugin/
├── .claude-plugin/plugin.json     manifest
├── hooks/
│   ├── hooks.json                 hook registrations
│   ├── session-start/
│   │   └── env-export.sh
│   ├── pre-tool-use/
│   │   └── push-guard.sh
│   ├── post-tool-use/
│   │   └── validate-changeset.sh
│   ├── lib/                       canonical helpers
│   │   ├── hook-output.sh         emit_noop, emit_context, …
│   │   ├── hook-debug.sh          hook_error, hook_debug
│   │   └── source-session-env.sh  lateral env propagation
│   ├── fixtures/                  BATS input fixtures
│   └── test/                      BATS test files
├── skills/
│   ├── check/
│   │   ├── SKILL.md
│   │   └── scripts/               bundled CLI wrappers
│   │       ├── check.sh           savvy-changesets check
│   │       └── lint.sh            savvy-changesets lint (machine-readable)
│   ├── list/
│   │   ├── SKILL.md
│   │   └── scripts/
│   │       └── list.sh            @changesets/cli status --output (JSON)
│   ├── config/
│   │   ├── SKILL.md
│   │   └── scripts/
│   │       └── inspect.sh         .changeset/config.json + versionFiles linkage
│   └── <other-skill>/SKILL.md
└── agents/<name>.md
```

## Bundled scripts pattern

Some skills ship `scripts/` directories containing bash scripts that shell out to project-installed CLIs (`savvy-changesets` and `@changesets/cli`). The skill body invokes them via `${CLAUDE_PLUGIN_ROOT}/skills/<skill-name>/scripts/<name>.sh` — `CLAUDE_PLUGIN_ROOT` is the plugin's installation directory and is both substituted inline in skill markdown and exported as an env var to subprocesses, so the path resolves regardless of cwd or whether the script is invoked via the Bash tool or a markdown shell-execution block.

The pattern is most useful for skills whose output should be **deterministic**: validation results (`check`), structured listings (`list`), preview rendering. The CLIs already implement the canonical logic; the script is a thin adapter that handles package-manager detection and propagates exit codes. Re-implementing the same logic in the skill body would drift from the CLI's behavior.

The scripts assume:

- `@savvy-web/changesets` is installed in the project (for `savvy-changesets check`, `lint`, `transform`, `version`).
- `@changesets/cli` is installed in the project (for `changeset status`, etc.).

Both are dev dependencies of any project that uses this plugin meaningfully. The scripts exit `1` with a clear error if either CLI is missing.

Package-manager detection follows the same precedence used by the SessionStart hook: `$CHANGESETS_PACKAGE_MANAGER` (preset by the hook) → `package.json#packageManager` → lockfile presence (`pnpm-lock.yaml` → `pnpm`, `yarn.lock` → `yarn`, `bun.lock` → `bun`, otherwise `npm`).

## Testing the hooks

The plugin ships a BATS test suite covering each hook's happy path and no-op paths. From the plugin directory:

```bash
cd plugin/hooks
bats test/
```

Requires `bats` (`brew install bats-core`) and `jq`.

## Namespaced session env

`SessionStart` writes the following exports both to `~/.claude/session-env/<session-id>/changesets-hook.sh` (for other hooks via `source_session_env`) and to `$CLAUDE_ENV_FILE` (for Bash-tool subprocesses):

| Variable | Source |
| --- | --- |
| `CHANGESETS_PROJECT_DIR` | `$CLAUDE_PROJECT_DIR` (falls back to the SessionStart envelope's `cwd`) |
| `CHANGESETS_DATA_DIR` | `$CLAUDE_PLUGIN_DATA` |
| `CHANGESETS_PLUGIN_ROOT` | `$CLAUDE_PLUGIN_ROOT` |
| `CHANGESETS_SESSION_ID` | The session id from the envelope |
| `CHANGESETS_PACKAGE_MANAGER` | Detected from `package.json#packageManager` or lockfile presence |

Reader hooks use `CHANGESETS_PACKAGE_MANAGER` to skip re-detection on every tool call.
