# API Reference

This document covers the public classes and types exported from `@savvy-web/changesets`.

The package provides two API surfaces:

- **Class-based API** -- Static classes for consumers who do not use Effect
- **Effect services** -- Services, layers, schemas, and tagged errors for Effect-native consumers

## Class-Based API

Import from the main entry point:

```typescript
import {
  ChangelogTransformer,
  ChangesetLinter,
  Categories,
  Changelog,
} from "@savvy-web/changesets";
```

### ChangelogTransformer

Runs all seven remark transform plugins against CHANGELOG markdown content.

#### `ChangelogTransformer.transformContent(content)`

Transform a markdown string by running all transform plugins.

- **Parameters:**
  - `content` (`string`) -- Raw CHANGELOG markdown
- **Returns:** `string` -- The transformed markdown

```typescript
const result =
  ChangelogTransformer.transformContent(rawMarkdown);
```

#### `ChangelogTransformer.transformFile(filePath)`

Transform a CHANGELOG file in-place. Reads the file, runs all plugins, and writes the result back.

- **Parameters:**
  - `filePath` (`string`) -- Path to the file
- **Returns:** `void`

```typescript
ChangelogTransformer.transformFile("CHANGELOG.md");
```

### ChangesetLinter

Runs the five remark-lint rules against changeset markdown and returns structured diagnostic messages.

#### `ChangesetLinter.validate(dir)`

Validate all `.md` files in a directory (excluding `README.md`).

- **Parameters:**
  - `dir` (`string`) -- Directory path to scan
- **Returns:** `LintMessage[]` -- Aggregated messages

```typescript
const messages =
  ChangesetLinter.validate(".changeset");
```

#### `ChangesetLinter.validateFile(filePath)`

Validate a single changeset file.

- **Parameters:**
  - `filePath` (`string`) -- Path to the `.md` file
- **Returns:** `LintMessage[]` -- Lint messages

```typescript
const messages =
  ChangesetLinter.validateFile(".changeset/foo.md");
```

#### `ChangesetLinter.validateContent(content, filePath?)`

Validate a markdown string directly. Strips YAML frontmatter before running lint rules.

- **Parameters:**
  - `content` (`string`) -- Raw markdown content
  - `filePath` (`string`, optional) -- For error reporting, defaults to `"<input>"`
- **Returns:** `LintMessage[]` -- Lint messages

```typescript
const messages =
  ChangesetLinter.validateContent(markdown);
```

### LintMessage

A single lint diagnostic returned by `ChangesetLinter`.

```typescript
interface LintMessage {
  /** File path that was validated. */
  file: string;
  /** Rule name that produced the message. */
  rule: string;
  /** Line number (1-based). */
  line: number;
  /** Column number (1-based). */
  column: number;
  /** Human-readable message. */
  message: string;
}
```

### Categories

Static class for category operations. Maps conventional commit types to changelog section categories and validates section headings.

#### `Categories.fromCommitType(type, scope?, breaking?)`

Resolve a conventional commit type to its category.

- **Parameters:**
  - `type` (`string`) -- Commit type (e.g., `"feat"`)
  - `scope` (`string`, optional) -- Scope (e.g., `"deps"`)
  - `breaking` (`boolean`, optional) -- Breaking flag
- **Returns:** `SectionCategory`

```typescript
const cat = Categories.fromCommitType("feat");
// { heading: "Features", priority: 2, ... }

const deps = Categories.fromCommitType(
  "chore",
  "deps",
);
// { heading: "Dependencies", priority: 10, ... }

const bc = Categories.fromCommitType(
  "feat",
  undefined,
  true,
);
// { heading: "Breaking Changes", priority: 1, ... }
```

#### `Categories.fromHeading(heading)`

Look up a category by its section heading text. Case-insensitive.

- **Parameters:**
  - `heading` (`string`) -- The heading text
- **Returns:** `SectionCategory | undefined`

```typescript
const cat = Categories.fromHeading("Bug Fixes");
// { heading: "Bug Fixes", priority: 3, ... }
```

#### `Categories.isValidHeading(heading)`

Check whether a heading matches a known category. Case-insensitive.

- **Parameters:**
  - `heading` (`string`) -- The heading text
- **Returns:** `boolean`

#### `Categories.allHeadings()`

Get all valid section heading strings in priority order.

- **Returns:** `readonly string[]`

#### `Categories.ALL`

All 13 categories ordered by priority (ascending).

- **Type:** `readonly SectionCategory[]`

### DependencyTable

Static class for parsing, serializing, and manipulating dependency tables in changeset files.

Import from the main entry point:

```typescript
import { DependencyTable } from "@savvy-web/changesets";
```

#### `DependencyTable.parse(tableNode)`

Parse a GFM table AST node into structured dependency rows.

- **Parameters:**
  - `tableNode` -- A mdast `Table` node
- **Returns:** `DependencyTableRow[]`

#### `DependencyTable.serialize(rows)`

Serialize structured dependency rows back into a mdast `Table` node.

- **Parameters:**
  - `rows` (`DependencyTableRow[]`) -- The rows to serialize
- **Returns:** mdast `Table` node

#### `DependencyTable.toMarkdown(rows)`

Convert structured dependency rows to a markdown string.

- **Parameters:**
  - `rows` (`DependencyTableRow[]`) -- The rows to convert
- **Returns:** `string`

#### `DependencyTable.collapse(rows)`

Collapse multiple rows for the same dependency into a single row (e.g., when a dependency is added and then updated across changesets).

- **Parameters:**
  - `rows` (`DependencyTableRow[]`) -- The rows to collapse
- **Returns:** `DependencyTableRow[]`

#### `DependencyTable.sort(rows)`

Sort dependency rows alphabetically by dependency name.

- **Parameters:**
  - `rows` (`DependencyTableRow[]`) -- The rows to sort
- **Returns:** `DependencyTableRow[]`

#### `DependencyTable.aggregate(rows)`

Aggregate dependency rows by collapsing duplicates and sorting the result.

- **Parameters:**
  - `rows` (`DependencyTableRow[]`) -- The rows to aggregate
- **Returns:** `DependencyTableRow[]`

### Changelog

Static class wrapper for changelog formatting. Delegates to the Changesets-compatible functions with Effect-based internals.

#### `Changelog.formatReleaseLine(changeset, versionType, options)`

Format a single changeset into a changelog release line.

- **Parameters:**
  - `changeset` -- The changeset object
  - `versionType` -- `"major"`, `"minor"`, or `"patch"`
  - `options` -- Config with `repo` in `owner/repo` format
- **Returns:** `Promise<string>`

#### `Changelog.formatDependencyReleaseLine(changesets, dependenciesUpdated, options)`

Format dependency update release lines.

- **Parameters:**
  - `changesets` -- Array of changesets
  - `dependenciesUpdated` -- Dependencies that changed
  - `options` -- Config with `repo`
- **Returns:** `Promise<string>`

## Types

### SectionCategory

Defines how changes are grouped in release notes.

```typescript
interface SectionCategory {
  /** Display heading (e.g., "Features"). */
  heading: string;
  /** Priority for ordering (lower = first). */
  priority: number;
  /** Conventional commit types for this category. */
  commitTypes: string[];
  /** Brief description. */
  description: string;
}
```

### ChangesetOptions

Configuration options for the changelog formatter.

```typescript
interface ChangesetOptions {
  /** GitHub repo in owner/repo format. */
  repo: string;
  /** Include commit hash links. */
  commitLinks?: boolean;
  /** Include pull request links. */
  prLinks?: boolean;
  /** Include issue reference links. */
  issueLinks?: boolean;
  /** Custom issue prefixes (e.g., ["#", "GH-"]). */
  issuePrefixes?: string[];
  /** Additional JSON files to update with version numbers. */
  versionFiles?: VersionFileConfig[];
}
```

### VersionFileConfig

Configuration for a single version file entry. Used inside the `versionFiles` array. See [Configuration: Version Files](./configuration.md#versionfiles-optional) for full usage details.

```typescript
interface VersionFileConfig {
  /** Glob pattern to match JSON files. */
  glob: string;
  /** JSONPath expressions to locate version fields. Defaults to ["$.version"]. */
  paths?: string[];
  /** Workspace package name to source the version from, bypassing path-based resolution. */
  package?: string;
}
```

### DependencyTableRow

A single row in a dependency table.

```typescript
interface DependencyTableRow {
  /** Package name. */
  dependency: string;
  /** Dependency type. */
  type: "dependency" | "devDependency" | "peerDependency" | "optionalDependency" | "workspace" | "config";
  /** What happened to the dependency. */
  action: DependencyAction;
  /** Previous version (em dash for added). */
  from: string;
  /** New version (em dash for removed). */
  to: string;
}
```

### DependencyAction

The action performed on a dependency.

```typescript
type DependencyAction = "added" | "updated" | "removed";
```

## Effect Services (Advanced)

For Effect-native consumers, the package exports services, layers, and tagged errors.

### Services

- `ChangelogService` -- Changelog formatting
- `GitHubService` -- GitHub API integration
- `MarkdownService` -- Markdown parsing

### Layers

- `GitHubLive` -- Production GitHub API layer
- `makeGitHubTest` -- Test layer factory
- `MarkdownLive` -- Production markdown layer

### Tagged Errors

- `ConfigurationError` -- Invalid or missing config
- `GitHubApiError` -- GitHub API failures
- `MarkdownParseError` -- Markdown parsing failures
- `ChangesetValidationError` -- Validation failures
- `VersionFileError` -- Version file update failures (file read/parse/JSONPath errors)

### Schemas

- `ChangesetOptionsSchema` -- Options validation
- `SectionCategorySchema` -- Category validation
- `CommitHashSchema` -- Commit hash validation
- `RepoSchema` -- Repository format validation
- `JsonPathSchema` -- JSONPath expression validation (must start with `$.`)
- `VersionFileConfigSchema` -- Single version file entry validation
- `VersionFilesSchema` -- Array of version file configs validation
- `DependencyActionSchema` -- Dependency action validation (`added`, `updated`, `removed`)
- `DependencyTableRowSchema` -- Single dependency table row validation
- `DependencyTableSchema` -- Array of dependency table rows validation
- `DependencyTableTypeSchema` -- Dependency type validation (`dependency`, `devDependency`, etc.)
- `VersionOrEmptySchema` -- Semver version or em dash validation

## Remark Plugins (`./remark`)

All lint rules and transform plugins are exported from a single entry point:

```typescript
import {
  // Lint rules
  SilkChangesetPreset,
  HeadingHierarchyRule,
  RequiredSectionsRule,
  ContentStructureRule,
  UncategorizedContentRule,
  DependencyTableFormatRule,
  // Transform plugins
  SilkChangesetTransformPreset,
  MergeSectionsPlugin,
  ReorderSectionsPlugin,
  DeduplicateItemsPlugin,
  ContributorFootnotesPlugin,
  IssueLinkRefsPlugin,
  NormalizeFormatPlugin,
  AggregateDependencyTablesPlugin,
} from "@savvy-web/changesets/remark";
```

### Lint Rules

- `SilkChangesetPreset` -- Array of all five rules
- `HeadingHierarchyRule` -- h2 start, no h1, no skips
- `RequiredSectionsRule` -- Known category headings
- `ContentStructureRule` -- Non-empty content
- `UncategorizedContentRule` -- Content must be under a category heading
- `DependencyTableFormatRule` -- Dependency table structure validation

### Transform Plugins

- `SilkChangesetTransformPreset` -- All seven in order
- `AggregateDependencyTablesPlugin` -- Consolidate dependency tables
- `MergeSectionsPlugin` -- Combine duplicate headings
- `ReorderSectionsPlugin` -- Sort by category priority
- `DeduplicateItemsPlugin` -- Remove duplicate list items
- `ContributorFootnotesPlugin` -- Aggregate attributions
- `IssueLinkRefsPlugin` -- Consolidate reference links
- `NormalizeFormatPlugin` -- Remove empties, clean up
