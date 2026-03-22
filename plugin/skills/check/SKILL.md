---
name: check
description: >
  Validate existing changeset files in .changeset/ against @savvy-web/changesets
  format rules. Checks structural compliance with CSH001-CSH005 rules and
  reports errors with file paths and rule codes.
---

# Changeset Validation

Validate all changeset files in `.changeset/` against the `@savvy-web/changesets` structural rules.

## Step 1: Find Changeset Files

Find all `.changeset/*.md` files, excluding `README.md`:

- List all `.md` files in the `.changeset/` directory
- Exclude any file named `README.md`
- If no files are found, report "No changeset files found" and stop

## Step 2: Read Each File

Read each discovered changeset file in full before beginning validation.

## Step 3: Validate Each File

For each file, validate the following. Collect all violations — do not stop at the first error.

### YAML Frontmatter Check

The file must begin with a YAML frontmatter block delimited by `---`. The frontmatter must contain at least one entry mapping a package name (string) to a bump type of `patch`, `minor`, or `major`.

Valid example:

```yaml
---
"@savvy-web/some-package": patch
---
```

Violation if: frontmatter is absent, malformed, or contains no valid package-to-bump-type mapping.

### CSH001 — Heading Structure

- No `#` (h1) headings are allowed anywhere in the file body (outside frontmatter)
- Heading depth must not skip levels (e.g., jumping from `##` directly to `####` is a violation; `##` to `###` is valid)

### CSH002 — Valid Section Headings

All `##` (h2) headings must exactly match one of these 13 known categories:

| Priority | Heading |
| :--- | :--- |
| 1 | Breaking Changes |
| 2 | Features |
| 3 | Bug Fixes |
| 4 | Performance |
| 5 | Documentation |
| 6 | Refactoring |
| 7 | Tests |
| 8 | Build System |
| 9 | CI |
| 10 | Dependencies |
| 11 | Maintenance |
| 12 | Reverts |
| 13 | Other |

Matching is case-sensitive and exact. Any `##` heading not in this list is a violation.

### CSH003 — Content Quality

- Every `##` section must contain at least one non-empty content node (paragraph, list, code block, etc.) — no empty sections
- Every code fence must include a language identifier (e.g., ` ```typescript `, not bare ` ``` `)
- No list items may be empty (a list item containing only whitespace counts as empty)

### CSH004 — No Preamble Content

There must be no content before the first `##` heading in the file body (outside frontmatter). Any paragraph, list, code block, or other node that appears before the first `##` heading is a violation.

### CSH005 — Dependency Table Schema

If the file contains any Markdown table under a `## Dependencies` section, the table must follow this 5-column schema:

| Dependency | Type | Action | From | To |
| :--- | :--- | :--- | :--- | :--- |
| effect | dependency | updated | 3.18.0 | 3.19.1 |

- Column 1: `Dependency` — the package name (non-empty)
- Column 2: `Type` — one of: `dependency`, `devDependency`, `peerDependency`, `optionalDependency`, `workspace`, `config`
- Column 3: `Action` — one of: `added`, `updated`, `removed`
- Column 4: `From` — previous version or `—` (em dash) for added packages
- Column 5: `To` — new version or `—` (em dash) for removed packages

A table with different column names, a different number of columns, or invalid values is a violation.

## Step 4: Report Results

Report results for each file, then a summary.

### Per-File Format

For each file, print the file path and its status. If there are violations, list each one with its rule code and a short description of what was found.

**Passing file:**

```text
.changeset/my-changeset.md — PASS
```

**Failing file:**

```text
.changeset/my-changeset.md — FAIL
  CSH002  Unknown h2 heading: "New Features" (expected one of the 13 known categories)
  CSH003  Empty section under "## Bug Fixes"
  CSH003  Code fence missing language identifier (line ~14)
```

### Summary Format

After all per-file results, print a summary line:

```text
X files checked — Y passed, Z failed
```

If all files pass:

```text
X files checked — all passed
```

## Output Guidance

- Be concise: one line per violation, with rule code first
- Include enough context in violation messages to identify the exact problem (heading text, approximate location, etc.)
- Do not suggest fixes in this output — validation only
- If a file cannot be read, report it as a failure with a note that it could not be read
