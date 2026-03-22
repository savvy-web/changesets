---
name: list
description: >
  List all pending changeset files in .changeset/ with a summary showing
  filename, affected packages, bump types, and first line of content.
  Use to get an overview of queued changes before release.
disable-model-invocation: true
---

# List Pending Changesets

Display a summary of all pending changeset files in `.changeset/`.

## Step 1: Find Changeset Files

List all `.md` files in the `.changeset/` directory:

- Exclude any file named `README.md`
- If no files are found, report "No pending changesets" and stop

## Step 2: Read Each File

For each discovered file, read its full contents to extract:

1. The YAML frontmatter block (between the opening and closing `---` delimiters) — parse all package-to-bump-type mappings
2. The first non-empty line of body content that appears after the first `##` heading

## Step 3: Build the Summary Table

Construct a formatted list or table with one row per changeset file containing:

- **Filename** — the bare filename without the `.changeset/` path prefix and without the `.md` extension
- **Packages** — all package-to-bump-type pairs from the frontmatter, formatted as `package-name: bump-type`, with multiple packages separated by `,`
- **Preview** — the first non-empty line of content following the first `##` heading, truncated to ~80 characters with `…` appended if truncated; if no `##` heading or body content exists, use `(no content)`

Format example:

```text
Changeset              Packages                              Preview
--------------------   -----------------------------------   ----------------------------------------
fuzzy-lions-dance      @savvy-web/changesets: minor          Adds three-layer remark pipeline for…
angry-bears-run        @savvy-web/rslib-builder: patch       Fixes export path resolution when…
```

Column widths may be adjusted to fit the actual content. A plain prose list is also acceptable if a table would be unwieldy.

## Step 4: Show Total Count

After the table, print a summary line:

```text
X pending changeset(s)
```

## Output Guidance

- Sort entries alphabetically by filename
- Do not validate changeset format or report errors — this is a read-only listing
- If a file cannot be read or its frontmatter cannot be parsed, include it in the list with `(unreadable)` in the Packages and Preview columns
- Keep output concise; this is a quick-glance overview, not a detailed report
