---
name: update
description: >
  Update an existing changeset file in .changeset/. Select a changeset to
  modify, then edit its content, bump types, or affected packages. Use when
  the scope of a change evolves after the initial changeset was created.
disable-model-invocation: true
---

# Update a Changeset

Before making any edits, load the format specification by invoking the `format` skill via the Skill tool. It contains the complete list of valid section headings, structural rules, content depth tiers, and examples. Do not proceed until that skill is loaded.

## Step 1 — Identify the Target Changeset

Find all `.changeset/*.md` files, excluding `README.md`.

If `$ARGUMENTS` names a specific changeset file (e.g., `brave-dogs-laugh` or `brave-dogs-laugh.md`), resolve it to `.changeset/<name>.md` and use that file. Skip the selection prompt.

If `$ARGUMENTS` is empty or does not identify a file, list the available changesets with their file paths and a one-line summary of the frontmatter (package names and bump types). Ask the user to pick one before continuing.

If no changeset files exist, report "No changeset files found in .changeset/" and stop.

## Step 2 — Read the Selected Changeset

Read the full contents of the selected changeset file. Display it to the user so they can see the current state before proposing changes.

## Step 3 — Ask What to Change

Ask the user what they want to update. They may request one or more of the following:

- **Content** — add, remove, or edit sections; revise prose or bullet points within a section
- **Bump type** — upgrade or downgrade the bump level for one or more packages (e.g., `patch` → `minor`)
- **Affected packages** — add a package (with its bump type) or remove a package from the frontmatter
- **Open-ended** — describe the change in plain language and let the agent propose the appropriate edits

Do not make any edits yet. Wait for the user's answer.

## Step 4 — Propose the Updated Draft

Apply the requested changes to produce an updated draft. When doing so:

- Preserve valid structure at all times: YAML frontmatter block, valid `##` section headings from the 13 known categories, no content before the first `##` heading, no `#` h1 headings, no heading depth skips
- Do not reorder sections unless the user explicitly asks — preserve the author's original ordering
- Do not silently discard or rewrite content the user did not ask to change
- If the user described changes in plain language and the intent maps to multiple edits (e.g., a new section plus a bump upgrade), enumerate each proposed change clearly

Show the complete updated draft to the user and ask for confirmation before writing. If the user wants further adjustments, revise the draft and confirm again.

## Step 5 — Write the File

Once the user confirms the draft, write it back to the same file path. Do not rename the file or change the directory.

Confirm the file path to the user after writing.

Do NOT commit the file.
