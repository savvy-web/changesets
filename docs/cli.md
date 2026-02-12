# CLI Reference

The `savvy-changesets` CLI provides five subcommands
for bootstrapping repos, validating changeset files,
post-processing CHANGELOG.md files, and orchestrating
the version flow.

## Installation

The CLI is available as the `savvy-changesets` binary
when `@savvy-web/changesets` is installed:

```bash
pnpm add @savvy-web/changesets
```

## Commands

### `savvy-changesets init`

Bootstrap a repository for `@savvy-web/changesets`.
Creates the `.changeset/` directory, writes or patches
`config.json`, and configures markdownlint rules.

```bash
savvy-changesets init
```

**Options:**

| Option | Alias | Default | Description |
| :--- | :--- | :--- | :--- |
| `--force` | `-f` | `false` | Overwrite existing config files |
| `--quiet` | `-q` | `false` | Silence warnings, always exit 0 |
| `--markdownlint` | | `true` | Register rules in base config |

**Behavior:**

- Creates `.changeset/` directory if missing
- Writes `.changeset/config.json` with detected GitHub
  repo (or patches the `changelog` key if file exists)
- If `lib/configs/.markdownlint-cli2.jsonc` exists,
  registers custom rules and disables them globally
  (skip with `--markdownlint=false`)
- Writes `.changeset/.markdownlint.json` to enable rules
  for changeset files only (auto-detects `extends` path)

**Examples:**

```bash
# Bootstrap with auto-detection
savvy-changesets init

# Force overwrite existing configs
savvy-changesets init --force

# Skip base markdownlint registration
savvy-changesets init --markdownlint=false
```

**Exit codes:**

| Code | Meaning |
| :--- | :--- |
| 0 | Initialization successful |
| 1 | Error (unless `--quiet`) |

### `savvy-changesets lint`

Validate changeset files against remark-lint rules.
Outputs one line per error in machine-readable format.

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

Full validation with a human-readable grouped summary.
Same validation as `lint` but with friendlier output.

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

### `savvy-changesets transform`

Post-process a CHANGELOG.md file by running all six
remark transform plugins. This merges duplicate
sections, reorders by priority, deduplicates items,
aggregates footnotes, consolidates link references,
and normalizes formatting.

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
- **Dry run** (`--dry-run`) -- Prints the transformed
  output to stdout without modifying the file
- **Check** (`--check`) -- Compares the transformed
  output against the current file content and exits
  with code 1 if they differ (useful in CI)

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

Orchestrate the full version flow: detect the package
manager, run `changeset version`, discover all workspace
CHANGELOG.md files, and transform each one.

```bash
savvy-changesets version
```

**Options:**

| Option | Alias | Default | Description |
| :--- | :--- | :--- | :--- |
| `--dry-run` | `-n` | `false` | Skip changeset version, only transform |

**Modes:**

- **Default** -- Runs `changeset version` via the
  detected package manager, then discovers and transforms
  all workspace CHANGELOG.md files
- **Dry run** (`--dry-run`) -- Skips `changeset version`
  and only transforms existing CHANGELOG.md files (useful
  for testing transforms locally)

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

## Global Options

All subcommands support the built-in options provided
by the Effect CLI framework:

| Option | Description |
| :--- | :--- |
| `--help` | Show help for the command |
| `--version` | Show the package version |

## CI Usage

### Validate Changesets in CI

Add a step that runs `check` to verify all pending
changeset files are well-formed:

```yaml
- name: Validate changesets
  run: pnpm savvy-changesets check .changeset
```

### Version and Transform

Use the version command in your CI script:

```bash
savvy-changesets version && biome format --write .
```

The `version` command detects the package manager,
runs `changeset version`, discovers all workspace
CHANGELOG.md files, and transforms each one. Biome
then normalizes formatting.

### Check Formatting

Verify that CHANGELOG.md has already been transformed
(no-op check for PRs):

```yaml
- name: Check CHANGELOG formatting
  run: pnpm savvy-changesets transform --check
```
