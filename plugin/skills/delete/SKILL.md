---
name: delete
description: >
  Delete one or more changeset files from .changeset/. Select by name or
  interactively pick from the list. Use when a changeset is no longer
  needed after a revert or scope change.
disable-model-invocation: true
---

# Delete a Changeset

## Step 1 — Find Changeset Files

List all `.changeset/*.md` files, excluding `README.md`. If no changeset files are found, report "No changeset files found" and stop.

## Step 2 — Resolve Which Files to Delete

If `$ARGUMENTS` names one or more specific changeset files (with or without the `.changeset/` prefix or `.md` extension), resolve them to their full paths and use those as the candidates.

If `$ARGUMENTS` is empty or does not name specific files, list the available changeset files and ask the user to pick one or more before continuing. Do not proceed past this step until the user has made a selection.

## Step 3 — Show a Content Summary for Each Candidate

For each candidate file, read it and display a brief summary:

- **File:** `.changeset/<filename>.md`
- **Packages:** list each package name and its bump type from the YAML frontmatter
- **Summary:** the first non-empty content line from the file body (first paragraph text, first list item, or first heading — whichever appears first)

## Step 4 — Ask for Explicit Confirmation

After showing all summaries, ask once:

> Delete X changeset(s)? This cannot be undone.

List the filenames to be deleted so the user can see exactly what will be removed. Wait for an explicit "yes" or equivalent affirmation. If the user says anything other than a clear confirmation, abort and report that no files were deleted.

## Step 5 — Delete the Confirmed Files

For each confirmed file, delete it using:

```bash
rm .changeset/<filename>.md
```

## Step 6 — Report Results

List every file that was deleted. If any deletion fails (e.g., file not found), report the error for that file without stopping the remaining deletions, then summarize any failures at the end.

**Example output:**

```text
Deleted:
  .changeset/brave-dogs-laugh.md
  .changeset/silver-cups-dream.md
```

Never delete any file without explicit user confirmation from Step 4.
