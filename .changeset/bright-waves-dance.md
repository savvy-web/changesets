---
"@savvy-web/changesets": minor
---

## Features

### Claude Code Plugin

Add a companion Claude Code plugin (`changesets`) that helps agents and users write well-structured changeset files for GitHub release documentation. Install from the `savvy-web-bots` marketplace.

#### Skills

* `/changesets:create` — interactively create a changeset by analyzing the git diff, detecting affected packages, proposing bump types, and drafting content with valid section headings
* `/changesets:check` — validate existing `.changeset/*.md` files against the CSH001–CSH005 structural rules
* `/changesets:list` — overview of pending changesets with packages, bump types, and content previews
* `/changesets:update` — edit an existing changeset's content, bump types, or affected packages
* `/changesets:merge` — combine changesets that share the same package-to-bump-type mapping into a single file
* `/changesets:delete` — remove one or more changesets that are no longer needed
* `/changesets:preview` — preview what the combined CHANGELOG output would look like with all pending changesets
* `changesets:format` — auto-activating format reference that injects the complete format specification when Claude works with changeset files
* `changesets:status` — auto-activating awareness skill that prevents duplicate changesets and surfaces management options

#### Agent

* `changeset-writer` — autonomous subagent that Claude dispatches after completing implementation work to create properly structured changesets focused on release documentation quality

#### Hooks

* Pre-commit nudge — reminds the agent to consider creating a changeset before committing
* Write validation — validates changeset structure when writing to `.changeset/*.md`
* Post-task reminder — nudges if source files were modified but no changeset was created
