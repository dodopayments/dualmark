# Dualmark Verify Action

Verify AEO conformance of any URL against the [AEO Specification v1.0](https://dualmark.dev/docs/spec/overview) in one GitHub Actions step.

## Usage

```yaml
name: AEO Conformance

on:
  pull_request:
  push:
    branches: [main]

jobs:
  aeo:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - uses: dodopayments/dualmark/actions/verify@v1
        with:
          url: https://staging.example.com/blog/your-post
          level: standard
```

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `url` | ✅ | — | URL to verify for AEO conformance |
| `level` | — | `standard` | Minimum level: `basic`, `standard`, or `advanced` |
| `fail-on-regression` | — | `false` | Fail if score drops below previous run |
| `comment-on-pr` | — | `false` | Post a sticky PR comment with results |
| `artifact-name` | — | `aeo-report` | Artifact name for the uploaded report (use unique names for multi-URL workflows) |

## Outputs

| Output | Description | Example |
|---|---|---|
| `score` | Numeric score achieved | `105` |
| `max` | Maximum possible score | `125` |
| `level` | Conformance level | `standard` |

## Conformance Levels

| Level | Required Score | Checks |
|---|---|---|
| **Basic** | ≥ 60% | Markdown twin reachable, `Content-Type`, `X-Markdown-Tokens`, `X-Robots-Tag: noindex`, `Vary: Accept`, non-empty body |
| **Standard** | ≥ 80% | All Basic + HTML `rel=alternate`, Accept-header negotiation, 406 for unacceptable Accept |
| **Advanced** | ≥ 95% | All Standard + AI agent UA detection, `X-AEO-Version`, `nosniff` |

## Examples

### Basic check

```yaml
- uses: dodopayments/dualmark/actions/verify@v1
  with:
    url: https://example.com/blog/hello
    level: basic
```

### With PR comment

```yaml
- uses: dodopayments/dualmark/actions/verify@v1
  with:
    url: https://staging.example.com
    level: standard
    comment-on-pr: true
```

### With regression detection

```yaml
- uses: dodopayments/dualmark/actions/verify@v1
  with:
    url: https://staging.example.com
    level: standard
    fail-on-regression: true
    comment-on-pr: true
```

## Regression Detection

The action downloads the previous run's `aeo-report` artifact and compares scores.

- **First run**: no previous artifact exists — skips regression check
- **Re-run**: if current score < previous score — fails with `::error::`
- The artifact is then overwritten with the new result for the next run

## Artifacts

The action uploads `aeo.json` as a build artifact (`aeo-report`). Download in downstream jobs:

```yaml
- uses: actions/download-artifact@v4
  with:
    name: aeo-report
- run: node -e "
    const r = JSON.parse(require('fs').readFileSync('aeo.json','utf8'));
    console.log('Score:', r.score, '/', r.max, 'Level:', r.level);
  "
```

## Requirements

- **Bun runtime** — use `oven-sh/setup-bun@v2` in your workflow
- **`pull-requests: write`** — required for `comment-on-pr: true`

## Links

- [AEO Specification](https://dualmark.dev/docs/spec/overview)
- [`@dualmark/cli` on npm](https://www.npmjs.com/package/@dualmark/cli)
- [Issue tracker](https://github.com/dodopayments/dualmark/issues)
