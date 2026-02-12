# @savvy-web/changesets

[![npm version][npm-badge]][npm-url]
[![License: MIT][license-badge]][license-url]

Custom changelog formatter and markdown processing pipeline
for the Silk Suite. Replaces the default
`@changesets/cli/changelog` formatter with a three-layer
architecture that validates changeset files, formats
structured changelog entries, and post-processes the
generated CHANGELOG.md.

## Features

- **Section-aware changesets** -- Use h2 headings in
  changeset files to categorize changes (Features,
  Bug Fixes, Breaking Changes, etc.)
- **Three-layer pipeline** -- Pre-validation
  (remark-lint), changelog formatting (Changesets API),
  and post-processing (remark-transform)
- **13 section categories** -- Consistent categorization
  with priority-based ordering across all layers
- **CLI tooling** -- `savvy-changeset` binary with lint,
  transform, and check subcommands for CI and local use
- **GitHub integration** -- Automatic PR links, commit
  references, and contributor attribution

## Installation

```bash
pnpm add @savvy-web/changesets
```

## Quick Start

Configure in `.changeset/config.json`:

```json
{
  "changelog": [
    "@savvy-web/changesets/changelog",
    { "repo": "owner/repo" }
  ]
}
```

Write section-aware changeset files:

```markdown
---
"@my/package": minor
---

## Features

Added a new authentication system with OAuth2 support.

## Tests

- Added unit tests for OAuth2 flow
- Updated integration test fixtures
```

## CLI

```bash
savvy-changeset lint [dir]           # Validate changesets
savvy-changeset check [dir]          # Validate with summary
savvy-changeset transform [file]     # Post-process CHANGELOG
savvy-changeset transform --dry-run  # Preview without writing
savvy-changeset transform --check    # Exit 1 if changed (CI)
```

## Programmatic API

```typescript
import {
  ChangelogTransformer,
  ChangesetLinter,
  Categories,
} from "@savvy-web/changesets";

// Transform a CHANGELOG.md file in-place
ChangelogTransformer.transformFile("CHANGELOG.md");

// Validate all changeset files in a directory
const messages = ChangesetLinter.validate(".changeset");

// Look up a category by commit type
const category = Categories.fromCommitType("feat");
// => { heading: "Features", priority: 2, ... }
```

## Documentation

For configuration, the changeset format, CLI usage,
architecture, and API reference, see [docs/](./docs/).

## License

MIT

[npm-badge]: https://img.shields.io/npm/v/@savvy-web/changesets
[npm-url]: https://www.npmjs.com/package/@savvy-web/changesets
[license-badge]: https://img.shields.io/badge/License-MIT-yellow.svg
[license-url]: https://opensource.org/licenses/MIT
