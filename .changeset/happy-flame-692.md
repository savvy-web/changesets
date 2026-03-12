---
"@savvy-web/changesets": patch
---

## Bug Fixes

Remove injected `postinstall` script from published package.json. Security scanners flag `postinstall` scripts in dependencies as a potential supply chain risk. Fixes #31.
