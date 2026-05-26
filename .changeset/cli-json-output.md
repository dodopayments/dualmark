---
"@dualmark/cli": minor
---

Stabilize `dualmark verify --json` around an AEO Spec v1.0 JSON contract and enforce `--json` mutual exclusivity with `--quiet`/`--color`, while keeping required-check failures as non-zero exits.

Migration note: `--json` previously emitted the internal `VerifyReport` shape (`mdUrl`, `maxScore`, `passed[]`, `failed[]`, `skippedNegotiation`). It now emits the v1.0 public schema (`url`, `markdownUrl`, `score`, `max`, `level`, `skippedNegotiation`, `durationMs`, `checks[]`) with checks in canonical evaluation order.
