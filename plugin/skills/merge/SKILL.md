---
name: merge
description: >
  Merge multiple changeset files in .changeset/ that share the same
  package-to-bump-type mapping. Combines content from matching changesets
  into a single file and removes the originals. Use to consolidate
  related changesets before release.
disable-model-invocation: true
---

# Merge Changesets

Before doing anything else, load the `format` skill via the Skill tool. It contains the complete list of valid section headings, structural rules, content depth tiers, and examples. Do not proceed until that skill is loaded.

## Step 1 — Find Changeset Files

List all `.md` files in the `.changeset/` directory. Exclude `README.md`. If no files are found, report "No changeset files found" and stop.

## Step 2 — Parse Each File

Read every discovered changeset file. For each file, extract the YAML frontmatter and build a normalized package-to-bump-type mapping. The mapping is the complete set of package name / bump type pairs in the frontmatter — order does not matter, but both the package names and the bump types must match exactly.

## Step 3 — Group by Identical Frontmatter Mapping

Two changesets can be merged only if they have **identical** package-to-bump-type mappings: every package name must be the same, and every corresponding bump type must be the same.

Examples:

- `"@savvy-web/foo": minor` + `"@savvy-web/foo": minor` → can merge
- `"@savvy-web/foo": minor` + `"@savvy-web/foo": patch` → CANNOT merge (different bump type)
- `"@savvy-web/foo": minor, "@savvy-web/bar": patch` + `"@savvy-web/foo": minor, "@savvy-web/bar": patch` → can merge
- `"@savvy-web/foo": minor, "@savvy-web/bar": patch` + `"@savvy-web/foo": minor` → CANNOT merge (different package sets)

Groups with only one changeset have nothing to merge — skip them.

## Step 4 — Present Merge Groups for Confirmation

For each group that has two or more changesets, show the user:

1. The file names that will be merged together
2. The shared frontmatter (package-to-bump mapping)
3. A preview of the combined content (see Step 5 for how to combine sections)

Ask the user to confirm or reject each merge group individually before writing anything. The user may approve all, reject all, or approve a subset.

## Step 5 — Combine Content Sections

For each approved merge group, combine the body content as follows:

- Collect all `##` sections from every changeset in the group
- Where multiple changesets contain the same `##` section heading, merge their content under a single `##` heading — do not repeat the heading
- Use `### Sub-heading` within a merged section to separate contributions that are distinct enough to warrant separation (e.g., different sub-features or independent bug fix descriptions); omit sub-headings when the items are homogeneous and read naturally together as a flat list
- Apply the structural rules from the `format` skill to the merged result: no empty sections, no h1 headings, no preamble content, no heading depth skips
- The merged content depth tier should reflect the richest tier present among the source files

## Step 6 — Generate a Filename

Generate a new filename using the adjective-noun-verb pattern that `@changesets/cli` uses (e.g., `brave-dogs-laugh`, `silver-cups-dream`, `lucky-cats-fly`). The filename must be lowercase, hyphen-separated, and end in `.md`. Do not reuse any of the original filenames.

## Step 7 — Write the Merged File and Remove Originals

For each approved merge group:

1. Write the merged changeset to `.changeset/<generated-name>.md` with the shared frontmatter and combined content
2. Delete each of the original changeset files that were merged into it

## Step 8 — Report Results

After completing all merges, report:

- Which files were merged and what new filename was created for each group
- Which files were left unchanged (either skipped because the group had only one file, or rejected by the user)

Do not commit.
