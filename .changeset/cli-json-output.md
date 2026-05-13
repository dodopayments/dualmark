---
"@dualmark/cli": minor
---

Add `verify --json` output for CI/dashboard consumers with the AEO Spec v1.0 schema, enforce `--json` mutual exclusivity with quiet/color flags, and keep failure exit behavior non-zero when required checks fail.

Note: the JSON output shape now uses the spec-pinned v1 schema (`{ url, markdownUrl, score, max, level, durationMs, checks[] }`) instead of the previous raw internal report shape. Consumers parsing `--json` should update field mappings accordingly.
