---
"@savvy-web/changesets": minor
---

## Features

- Add structured dependency table format for changeset files and CHANGELOG output, replacing bullet-list entries with GFM tables (columns: Dependency, Type, Action, From, To)
- Add remark-lint rule CSH005 (`changeset-dependency-table-format`) to validate dependency table structure and semantics
- Add markdownlint rule CSH005 for editor and CI integration of dependency table validation
- Add `AggregateDependencyTablesPlugin` remark transform to collapse and sort dependency entries across multiple changesets into a single consolidated table per version block
- Add `DependencyTable` class-based API with parse, serialize, collapse, sort, and aggregate operations
- Add Effect schemas for dependency table validation: `DependencyActionSchema`, `DependencyTableTypeSchema`, `VersionOrEmptySchema`, `DependencyTableRowSchema`, `DependencyTableSchema`
- Rewrite `getDependencyReleaseLine` changelog formatter to emit markdown table format with automatic dependency type inference

## Documentation

- Add comprehensive TSDoc documentation across all source files with `@public`/`@internal` modifiers, `@remarks` blocks, cross-references, and complete `@example` programs
