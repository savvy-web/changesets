# CLI Reference

The `savvy-changesets` CLI provides a layered set of subcommands for bootstrapping repos, inspecting and validating configuration, classifying file changes against release surfaces, analyzing branches, managing dependency changesets, and orchestrating the version flow.

| Group | Commands |
| --- | --- |
| Bootstrap & validation | `init`, `lint`, `check`, `validate-file` |
| CHANGELOG pipeline | `transform`, `version` |
| Configuration inspection | `config show`, `config validate` |
| Release-surface classification | `classify`, `analyze-branch`, `release-surface` |
| Dependency changesets | `deps detect`, `deps regen` |

## Installation

The CLI is available as the `savvy-changesets` binary when `@savvy-web/changesets` is installed:

```bash
pnpm add @savvy-web/changesets
```

## Commands

### `savvy-changesets init`

Bootstrap a repository for `@savvy-web/changesets`. Creates the `.changeset/` directory, writes or patches `config.json`, and configures markdownlint rules.

```bash
savvy-changesets init
```

**Options:**

| Option | Alias | Default | Description |
| :--- | :--- | :--- | :--- |
| `--force` | `-f` | `false` | Overwrite existing config files |
| `--quiet` | `-q` | `false` | Silence warnings, always exit 0 |
| `--skip-markdownlint` | | `false` | Skip registering rules in base markdownlint config |
| `--check` | | `false` | Check config without writing (for postinstall) |

**Behavior:**

- Creates `.changeset/` directory if missing
- Writes `.changeset/config.json` with detected GitHub repo (or patches the `changelog` key if file exists)
- Searches for an existing markdownlint config in order: `lib/configs/.markdownlint-cli2.jsonc`, `lib/configs/.markdownlint-cli2.json`, `.markdownlint-cli2.jsonc`, `.markdownlint-cli2.json`. If found, registers custom rules and disables them globally. If not found, logs a warning. (Skip with `--skip-markdownlint`)
- Writes `.changeset/.markdownlint.json` to enable rules for changeset files only (auto-detects `extends` path from the discovered base config)

**Check mode** (`--check`):

Inspects current configuration without writing any files. Reports issues as warnings and advises the user to run `init --force` to fix. Always exits 0 -- intended for use in `postinstall` scripts to inform users when config is out of date.

```bash
# Postinstall check (informational only)
savvy-changesets init --check
```

**Examples:**

```bash
# Bootstrap with auto-detection
savvy-changesets init

# Force overwrite existing configs
savvy-changesets init --force

# Skip base markdownlint registration
savvy-changesets init --skip-markdownlint

# Check config in postinstall (always exits 0)
savvy-changesets init --check
```

**Exit codes:**

| Code | Meaning |
| :--- | :--- |
| 0 | Initialization successful (or `--check` mode) |
| 1 | Error (unless `--quiet`) |

### `savvy-changesets lint`

Validate changeset files against remark-lint rules. Outputs one line per error in machine-readable format.

```bash
savvy-changesets lint [dir]
```

**Arguments:**

| Argument | Default | Description |
| :--- | :--- | :--- |
| `dir` | `.changeset` | Directory to scan |

**Options:**

| Option | Alias | Default | Description |
| :--- | :--- | :--- | :--- |
| `--quiet` | `-q` | `false` | Only output errors |

**Output format:**

```text
file:line:col rule message
```

**Example:**

```bash
$ savvy-changesets lint .changeset
.changeset/bad-file.md:3:1 heading-hierarchy \
  First heading must be h2
.changeset/bad-file.md:5:1 required-sections \
  Unknown section heading "Stuff"
```

**Exit codes:**

| Code | Meaning |
| :--- | :--- |
| 0 | No lint errors found |
| 1 | One or more lint errors |

### `savvy-changesets check`

Full validation with a human-readable grouped summary. Same validation as `lint` but with friendlier output.

```bash
savvy-changesets check [dir]
```

**Arguments:**

| Argument | Default | Description |
| :--- | :--- | :--- |
| `dir` | `.changeset` | Directory to scan |

**Example:**

```bash
$ savvy-changesets check .changeset

.changeset/bad-file.md
  3:1  heading-hierarchy  First heading must be h2
  5:1  required-sections  Unknown section heading

1 file(s) with errors, 2 error(s) found
```

**Exit codes:**

| Code | Meaning |
| :--- | :--- |
| 0 | All files passed validation |
| 1 | One or more validation errors |

### `savvy-changesets validate-file`

Validate a single changeset file against remark-lint rules. Outputs one line per error in machine-readable format. Designed for editor integrations and automation hooks where only one file needs checking.

```bash
savvy-changesets validate-file <file>
```

**Arguments:**

| Argument | Description |
| :--- | :--- |
| `file` | Path to the changeset `.md` file (required) |

**Output format:**

```text
file:line:col rule message
```

When the file passes validation, the command prints `Valid.` to stdout.

**Example:**

```bash
$ savvy-changesets validate-file .changeset/cool-lions-sing.md
Valid.

$ savvy-changesets validate-file .changeset/bad-file.md
.changeset/bad-file.md:3:1 heading-hierarchy \
  First heading must be h2
.changeset/bad-file.md:5:1 required-sections \
  Unknown section heading "Stuff"
```

**Exit codes:**

| Code | Meaning |
| :--- | :--- |
| 0 | No lint errors found |
| 1 | One or more lint errors, or file cannot be read |

This command is used by the companion Claude Code plugin's PostToolUse hook to validate changeset files immediately after they are written or edited.

### `savvy-changesets transform`

Post-process a CHANGELOG.md file by running all seven remark transform plugins. This merges duplicate sections, reorders by priority, deduplicates items, aggregates footnotes, consolidates link references, and normalizes formatting.

```bash
savvy-changesets transform [file]
```

**Arguments:**

| Argument | Default | Description |
| :--- | :--- | :--- |
| `file` | `CHANGELOG.md` | File to transform |

**Options:**

| Option | Alias | Default | Description |
| :--- | :--- | :--- | :--- |
| `--dry-run` | `-n` | `false` | Print output, skip write |
| `--check` | `-c` | `false` | Exit 1 if file changes |

**Modes:**

- **Default** -- Transforms the file in-place
- **Dry run** (`--dry-run`) -- Prints the transformed output to stdout without modifying the file
- **Check** (`--check`) -- Compares the transformed output against the current file content and exits with code 1 if they differ (useful in CI)

**Examples:**

```bash
# Transform in-place
savvy-changesets transform CHANGELOG.md

# Preview without writing
savvy-changesets transform --dry-run CHANGELOG.md

# CI check (fails if not already formatted)
savvy-changesets transform --check CHANGELOG.md
```

**Exit codes:**

| Code | Meaning |
| :--- | :--- |
| 0 | File transformed (or already formatted) |
| 1 | File would change (check mode only) |

### `savvy-changesets version`

Orchestrate the full version flow: detect the package manager, run `changeset version`, discover all workspace CHANGELOG.md files, and transform each one.

```bash
savvy-changesets version
```

**Options:**

| Option | Alias | Default | Description |
| :--- | :--- | :--- | :--- |
| `--dry-run` | `-n` | `false` | Skip changeset version, only transform |

**Steps (in order):**

1. Detect the package manager (pnpm, npm, or yarn)
2. Run `changeset version` (skipped in dry-run mode)
3. Discover all workspace CHANGELOG.md files
4. Transform each CHANGELOG.md through the remark pipeline
5. Update version files if [`versionFiles`](./configuration.md#versionfiles-optional) is configured (simulated in dry-run mode)

**Modes:**

- **Default** -- Runs `changeset version` via the detected package manager, discovers and transforms all workspace CHANGELOG.md files, and updates any configured version files
- **Dry run** (`--dry-run`) -- Skips `changeset version`, transforms existing CHANGELOG.md files, and simulates version file updates without writing (useful for testing locally)

**Examples:**

```bash
# Full version flow
savvy-changesets version

# Transform existing CHANGELOGs without running changeset version
savvy-changesets version --dry-run
```

**Exit codes:**

| Code | Meaning |
| :--- | :--- |
| 0 | All changelogs transformed successfully |
| 1 | changeset version or transform failed |

## Configuration Inspection

### `savvy-changesets config show`

Print the resolved `.changeset/config.json` after schema validation, workspace resolution, glob materialization, and overlap detection. The output is what downstream commands actually consume — useful for debugging unexpected classification results.

```bash
savvy-changesets config show [dir]
```

**Arguments:**

| Argument | Default | Description |
| :--- | :--- | :--- |
| `dir` | `.` | Project root (the directory containing `.changeset/`) |

**Options:**

| Option | Default | Description |
| :--- | :--- | :--- |
| `--json` | `false` | Emit JSON instead of human-readable output |

**Output shape (JSON):**

```jsonc
{
  "configPath": "/abs/path/.changeset/config.json",
  "projectDir": "/abs/path",
  "changelog": "@savvy-web/changesets/changelog",
  "baseBranch": "main",
  "access": "restricted",
  "ignore": [],
  "packages": [
    {
      "name": "@scope/foo",
      "workspaceDir": "/abs/path/packages/foo",
      "version": "1.2.3",
      "additionalScopes": ["plugin/**"],
      "additionalScopeFiles": ["/abs/path/plugin/SKILL.md", ...],
      "versionFiles": [
        { "glob": "plugin/.claude-plugin/plugin.json",
          "paths": ["$.version"],
          "matchedFiles": ["/abs/path/plugin/.claude-plugin/plugin.json"] }
      ]
    }
  ],
  "legacyVersionFilesUsed": false
}
```

`legacyVersionFilesUsed: true` indicates the config still uses the deprecated top-level `versionFiles[]` array (see [configuration.md](./configuration.md#migrating-from-versionfiles)). The CLI also writes a one-line deprecation warning to stderr on that same run.

### `savvy-changesets config validate`

Validate-only mode — exit code is the signal. Useful as a CI gate.

```bash
savvy-changesets config validate [dir]
```

**Behavior:**

- Logs a one-line `OK ... — N packages declared` on success.
- Logs `FAIL <field>: <reason>` and sets `process.exitCode = 1` on failure (overlap, unknown package keys, dual-shape, schema errors).
- Never modifies anything.

## Release-Surface Classification

### `savvy-changesets classify`

Map one or more paths to their owning package. Resolution order: workspace match → `additionalScopes` glob → `versionFiles` glob → `null` (unmapped).

```bash
savvy-changesets classify <paths...>
```

**Arguments:**

| Argument | Description |
| :--- | :--- |
| `paths` | One or more repo-relative file paths (variadic) |

**Options:**

| Option | Default | Description |
| :--- | :--- | :--- |
| `--cwd` | `.` | Project root |
| `--json` | `false` | Emit JSON instead of tab-separated lines |

**Example output (human format):**

```text
packages/foo/src/index.ts @scope/foo workspace
plugin/SKILL.md @scope/foo additionalScope: plugin/**
unrelated/notes.md <unmapped>
```

### `savvy-changesets analyze-branch`

Diff the current branch against its base and classify every changed file in one shot. This is the primary call agents use to figure out what changesets the branch needs.

```bash
savvy-changesets analyze-branch
```

**Options:**

| Option | Default | Description |
| :--- | :--- | :--- |
| `--cwd` | `.` | Project root |
| `--base` | config `baseBranch` then `origin/HEAD` then `main` | Override the base branch |
| `--json` | `false` | Emit JSON instead of human-readable output |

**Diff coverage:** committed changes since the merge base, **plus** staged changes, unstaged modifications, and untracked files. The result reflects what the branch would contain if everything currently visible were committed.

**Output shape (JSON):**

```jsonc
{
  "baseBranch": "main",
  "mergeBaseSha": "<sha>",
  "files": [
    { "path": "...", "status": "added", "package": "@scope/foo", "reason": "workspace" },
    { "path": "...", "status": "modified", "package": "@scope/foo",
      "reason": { "kind": "additionalScope", "glob": "plugin/**" } },
    { "path": "...", "status": "added", "package": null, "reason": null }
  ],
  "packagesAffected": ["@scope/foo"],
  "unmappedFiles": ["..."]
}
```

`status` values: `"added"`, `"modified"`, `"deleted"`, `"renamed"`, `"copied"`, `"typechange"`, `"unmerged"`, `"unknown"`.

`reason` values: `"workspace"` (file inside a workspace package directory), `{kind:"additionalScope", glob}` (file matched a glob in `packages[<name>].additionalScopes`), `{kind:"versionFile", glob}` (file matched a `versionFiles` glob), or `null` (unmapped).

### `savvy-changesets release-surface`

Print every path owned by a single package — workspace directory, materialized `additionalScopes` files, and `versionFiles` targets.

```bash
savvy-changesets release-surface <package>
```

**Arguments:**

| Argument | Description |
| :--- | :--- |
| `package` | A package name declared in `.changeset/config.json#changelog[1].packages` |

**Options:**

| Option | Default | Description |
| :--- | :--- | :--- |
| `--cwd` | `.` | Project root |
| `--json` | `false` | Emit JSON instead of human-readable output |

Exits non-zero when the named package isn't declared in the config.

## Dependency Changesets

### `savvy-changesets deps detect`

Read-only inspection. Compute the per-workspace-package dependency diff between two refs and render either structured JSON or ready-to-paste CSH005 markdown blocks.

```bash
savvy-changesets deps detect
```

**Options:**

| Option | Default | Description |
| :--- | :--- | :--- |
| `--cwd` | `.` | Project root |
| `--from` | merge-base with `baseBranch` | Older ref to diff from |
| `--to` | working tree | Newer ref to diff to (when omitted, includes committed + staged + unstaged + untracked) |
| `--package` | (all publishable) | Restrict output to a single workspace package |
| `--json` | `true` | Emit JSON (default) |
| `--markdown` | `false` | Emit one frontmatter+section block per workspace package, ready to paste into `.changeset/*.md` |

**Publishability filter:** by default, non-publishable workspace packages (e.g., the private monorepo root) are filtered out. Their dep changes never reach an npm release, so a changeset for them would only confuse the CHANGELOG. Pass `--package <name>` explicitly to override the filter for one package.

**Output (JSON):** Array of per-package `WorkspaceDependencyDiff` objects, each with `package`, `relativePath`, and a `rows[]` array following the [CSH005 schema](./rules/CSH005.md).

**Diff sources:** Only declared dependencies (the `dependencies` / `devDependencies` / `peerDependencies` / `optionalDependencies` fields of each workspace's `package.json`). Lockfile-only resolution drift is excluded — that happens on every `pnpm install` and would generate constant noise.

### `savvy-changesets deps regen`

Destructive: delete every "pure dependency changeset" in `.changeset/` and write fresh single-package `patch`-bump changesets reflecting the current cumulative dep diff.

```bash
savvy-changesets deps regen
```

**Options:**

| Option | Default | Description |
| :--- | :--- | :--- |
| `--cwd` | `.` | Project root |
| `--base` | config `baseBranch` | Override the base branch used for the merge base |
| `--package` | (all publishable) | Restrict to a single workspace package |
| `--dry-run` | `false` | Print the plan without writing or deleting |
| `--json` | `false` | Emit a structured plan as JSON |

**Strict "pure dependency changeset" detection:** A changeset is eligible for deletion-and-regeneration if and only if it satisfies all three:

1. Frontmatter declares exactly one package
2. Body contains exactly one `##` heading
3. That heading is `Dependencies`

Anything else (multi-package frontmatter, additional sections, hand-written comments) is treated as "mixed" and left untouched — its file path appears in the `skippedMixed` field of the JSON output for visibility.

**Output (JSON):**

```jsonc
{
  "toDelete":     [{ "file": "...", "package": "@scope/foo" }],
  "toWrite":      [{ "file": "...", "package": "@scope/foo", "diff": { ... } }],
  "skippedMixed": ["..."]
}
```

**Single-package convention:** Every `.changeset/*.md` file lists exactly one package in its frontmatter. `@changesets/cli` itself accepts multi-package frontmatter, but this project's `deps regen` enforces one package per file.

**Examples:**

```bash
# Default — delete all pure-dep changesets, regenerate from current diff
savvy-changesets deps regen

# Preview without writing
savvy-changesets deps regen --dry-run --json

# Regenerate only one workspace package's dep changeset
savvy-changesets deps regen --package @scope/foo

# Use a different base for the diff
savvy-changesets deps regen --base develop
```

## Global Options

All subcommands support the built-in options provided by the Effect CLI framework:

| Option | Description |
| :--- | :--- |
| `--help` | Show help for the command |
| `--version` | Show the package version |

## CI Usage

### Validate Changesets in CI

Add a step that runs `check` to verify all pending changeset files are well-formed:

```yaml
- name: Validate changesets
  run: pnpm savvy-changesets check .changeset
```

### Version and Transform

Use the version command in your CI script:

```bash
savvy-changesets version && biome format --write .
```

The `version` command detects the package manager, runs `changeset version`, discovers all workspace CHANGELOG.md files, and transforms each one. Biome then normalizes formatting.

### Check Formatting

Verify that CHANGELOG.md has already been transformed (no-op check for PRs):

```yaml
- name: Check CHANGELOG formatting
  run: pnpm savvy-changesets transform --check
```
