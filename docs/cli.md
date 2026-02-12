# CLI Reference

The `savvy-changeset` CLI provides three subcommands
for validating changeset files and post-processing
CHANGELOG.md files.

## Installation

The CLI is available as the `savvy-changeset` binary
when `@savvy-web/changesets` is installed:

```bash
pnpm add @savvy-web/changesets
```

## Commands

### `savvy-changeset lint`

Validate changeset files against remark-lint rules.
Outputs one line per error in machine-readable format.

```bash
savvy-changeset lint [dir]
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
$ savvy-changeset lint .changeset
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

### `savvy-changeset check`

Full validation with a human-readable grouped summary.
Same validation as `lint` but with friendlier output.

```bash
savvy-changeset check [dir]
```

**Arguments:**

| Argument | Default | Description |
| :--- | :--- | :--- |
| `dir` | `.changeset` | Directory to scan |

**Example:**

```bash
$ savvy-changeset check .changeset

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

### `savvy-changeset transform`

Post-process a CHANGELOG.md file by running all six
remark transform plugins. This merges duplicate
sections, reorders by priority, deduplicates items,
aggregates footnotes, consolidates link references,
and normalizes formatting.

```bash
savvy-changeset transform [file]
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
savvy-changeset transform CHANGELOG.md

# Preview without writing
savvy-changeset transform --dry-run CHANGELOG.md

# CI check (fails if not already formatted)
savvy-changeset transform --check CHANGELOG.md
```

**Exit codes:**

| Code | Meaning |
| :--- | :--- |
| 0 | File transformed (or already formatted) |
| 1 | File would change (check mode only) |

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
  run: pnpm savvy-changeset check .changeset
```

### Version and Transform

Use the full pipeline in your version script:

```bash
changeset version \
  && savvy-changeset transform \
  && biome format --write .
```

### Check Formatting

Verify that CHANGELOG.md has already been transformed
(no-op check for PRs):

```yaml
- name: Check CHANGELOG formatting
  run: pnpm savvy-changeset transform --check
```
