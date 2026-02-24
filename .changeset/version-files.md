---
"@savvy-web/changesets": minor
---

Add `versionFiles` option to bump version fields in additional JSON files

Some projects have JSON files beyond `package.json` that contain version fields (e.g., `.claude-plugin/marketplace.json`, `plugin.json`). The new `versionFiles` configuration option in `.changeset/config.json` identifies these files via glob patterns and uses JSONPath expressions to locate the version field(s) within each file.

Configuration example:

```json
{
  "changelog": ["@savvy-web/changesets/changelog", {
    "repo": "owner/repo",
    "versionFiles": [
      { "glob": "plugin.json", "paths": ["$.version"] },
      { "glob": ".claude-plugin/marketplace.json", "paths": ["$.metadata.version", "$.plugins[*].version"] }
    ]
  }]
}
```

When `paths` is omitted, defaults to `["$.version"]`. Version resolution uses longest-prefix workspace matching for monorepo support. The feature includes a custom minimal JSONPath implementation supporting property access, array wildcards, and array index access with zero external dependencies.
