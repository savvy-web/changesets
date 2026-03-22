---
name: create
description: >
  Interactively create a changeset file for @savvy-web/changesets. Analyzes
  git diff, detects affected packages, proposes bump types, and drafts a
  properly structured changeset with valid section headings.
disable-model-invocation: true
---

# Create a Changeset

Before drafting content, load the format specification by invoking the `format` skill via the Skill tool. It contains the complete list of valid section headings, structural rules, content depth tiers, and examples. Do not proceed to draft the changeset until that skill is loaded.

## Step 1 — Understand What Changed

Run `git diff <base-branch>...HEAD` (or `git diff main...HEAD` if no base is known) to review all changes on the current branch. If `$ARGUMENTS` contains package names, treat them as hints for which packages are affected; still verify against the diff.

## Step 2 — Detect Affected Packages

Read `pnpm-workspace.yaml` to find workspace package paths, then check each package's `package.json` for its `"name"` field. Cross-reference the diff file paths against workspace package directories to build the list of affected packages.

If `$ARGUMENTS` names specific packages, start with those and confirm they match the diff. The user may also name packages that have indirect effects (e.g., shared config changes) that the diff alone would not reveal.

## Step 3 — Propose Bump Types

For each affected package, propose a bump type based on the nature of the changes:

- **patch** — bug fixes, documentation updates, internal refactoring with no API changes, test changes, CI/build changes
- **minor** — new exported APIs, new features, non-breaking additions to existing behavior
- **major** — removed exports, changed function signatures, behavior changes that break existing consumers, anything requiring a migration

When in doubt between patch and minor, prefer minor. When in doubt between minor and major, prefer major and note the uncertainty.

## Step 4 — Propose a Content Depth Tier

Assess the significance of the changes and propose one of the three content depth tiers from the `format` skill:

- **Simple** — patch bump with a small, focused diff (e.g., single bug fix, typo correction)
- **Structured** — minor bump or a patch with multiple distinct changes across several files
- **Rich** — major bump, a significant new feature, or any change that requires migration guidance or usage examples

The user can always override the proposed tier.

## Step 5 — Confirm With the User

Present a summary and ask the user to confirm or adjust before writing anything:

1. List each affected package and its proposed bump type
2. State the proposed content depth tier and a one-sentence rationale
3. Ask whether to proceed, change any bump type, or change the tier

Do not write the file until the user confirms.

## Step 6 — Draft the Changeset Content

Using the confirmed packages, bump types, and tier, draft the changeset body. Apply the structural rules and section heading categories from the `format` skill. Key principle: focus on what someone upgrading the package needs to know, not engineering implementation details.

Show the draft to the user and invite edits before writing to disk.

## Step 7 — Generate a Filename

Generate a random changeset filename using the adjective-noun-verb pattern that `@changesets/cli` uses (e.g., `brave-dogs-laugh`, `silver-cups-dream`, `lucky-cats-fly`). The filename must be lowercase, hyphen-separated, and end in `.md`.

## Step 8 — Write the File

Write the final changeset to `.changeset/<generated-name>.md`. Confirm the file path to the user after writing.
