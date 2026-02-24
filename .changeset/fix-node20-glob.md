---
"@savvy-web/changesets": patch
---

## Bug Fixes

### Replace Node 22+ fs.globSync with tinyglobby

The `versionFiles` feature used `fs.globSync` which is only available in Node 22+. Consumers running on Node 20 (LTS) hit a `SyntaxError` at import time. Replaced with `tinyglobby` for cross-version compatibility.
