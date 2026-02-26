# Contributing

Thank you for your interest in contributing! This document provides guidelines and instructions for development.

## Prerequisites

- Node.js >= 24.0.0
- pnpm 10.30.0+
- TypeScript 5.9+

## Development Setup

```bash
# Clone the repository
git clone https://github.com/savvy-web/changesets.git
cd changesets

# Install dependencies
pnpm install

# Build all packages (dev + prod)
pnpm run build

# Run tests
pnpm run test
```

## Available Scripts

| Script | Description |
| :--- | :--- |
| `pnpm run build` | Build all (dev + prod) |
| `pnpm run build:dev` | Development build only |
| `pnpm run build:prod` | Production/npm build only |
| `pnpm run test` | Run all tests |
| `pnpm run test:watch` | Run tests in watch mode |
| `pnpm run test:coverage` | Run tests with v8 coverage |
| `pnpm run lint` | Check code with Biome |
| `pnpm run lint:fix` | Auto-fix lint issues |
| `pnpm run lint:md` | Check markdown with markdownlint |
| `pnpm run lint:md:fix` | Auto-fix markdown lint issues |
| `pnpm run typecheck` | Type-check via Turbo (tsgo) |

## Code Quality

This project uses:

- **Biome** for linting and formatting
- **Commitlint** for enforcing conventional commits
- **Husky** for Git hooks

### Commit Format

All commits must follow the [Conventional Commits](https://conventionalcommits.org) specification and include a DCO signoff:

```text
feat: add new feature

Signed-off-by: Your Name <your.email@example.com>
```

### Pre-commit Hooks

The following checks run automatically:

- **pre-commit**: Runs lint-staged (Biome format + lint)
- **commit-msg**: Validates commit message format
- **pre-push**: Runs tests

## Testing

Tests use [Vitest](https://vitest.dev) with v8 coverage. Coverage thresholds are enforced at 85% for lines, branches, and statements, and 80% for functions.

```bash
# Run all tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:coverage

# Run a single test file
pnpm vitest run src/changelog/index.test.ts
```

## TypeScript

- Strict mode enabled
- Import extensions required (`.js` for ESM)
- `node:` protocol for Node.js built-ins
- Separate type imports with `import type`

### Import Conventions

```typescript
// Use .js extensions for relative imports (ESM requirement)
import { myFunction } from "./utils/helpers.js";

// Use node: protocol for Node.js built-ins
import { readFileSync } from "node:fs";

// Separate type imports
import type { MyType } from "./types.js";
```

## Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Run tests: `pnpm run test`
5. Run linting: `pnpm run lint:fix`
6. Commit with conventional format and DCO signoff
7. Push and open a pull request

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
