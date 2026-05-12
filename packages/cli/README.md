# @dualmark/cli

`dualmark verify <url>` — conformance test runner for the AEO Specification.

## Install

```bash
bun add -d @dualmark/cli
# or run directly:
bunx @dualmark/cli verify https://example.com/blog/hello
```

## Usage

```bash
dualmark verify https://example.com/blog/hello
dualmark verify https://example.com/blog/hello.md --skip-negotiation
dualmark verify https://example.com --json
dualmark verify https://example.com --timeout 5000
```

### Flags

| Flag                 | Effect                                                                                                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--json`             | Emit machine-readable JSON (AEO Spec v1.0) instead of human-readable text; cannot be combined with `--quiet` or `--color`                                              |
| `--quiet`            | Suppress successful text output (failures still print report)                                                                                                          |
| `--color`            | Enable color mode for text output (reserved; currently no-op)                                                                                                          |
| `--no-color`         | Disable color mode for text output (reserved; currently no-op)                                                                                                         |
| `--skip-negotiation` | Skip Accept-header / Link-header / 406 checks. Use against sites that serve markdown only at `.md` URLs without runtime content negotiation (e.g. static-only deploys) |
| `--timeout <ms>`     | Per-request timeout (default 10000)                                                                                                                                    |

### JSON output schema (AEO Spec v1.0)

When `--json` is set, the CLI prints this object:

```json
{
  "url": "https://example.com/blog/hello",
  "markdownUrl": "https://example.com/blog/hello.md",
  "score": 95,
  "max": 100,
  "level": "advanced",
  "skippedNegotiation": false,
  "durationMs": 123,
  "checks": [
    {
      "id": "md.fetch",
      "points": 20,
      "max": 20,
      "passed": true,
      "message": "OK"
    }
  ]
}
```

Notes:

- `level` is one of `none`, `basic`, `standard`, `advanced`.
- `skippedNegotiation` indicates whether `--skip-negotiation` was used.
- `checks[].points` is `0` when a check fails, otherwise equal to `checks[].max`.
- `checks` preserve the canonical check evaluation order from the conformance runner.

### Exit codes

- `0` — pass (score ≥ 80% of max)
- `1` — fail (below threshold or any required check failed)
- `2` — CLI usage error

For GitHub Actions, GitLab CI, and Docker examples, see the [Use in CI guide](https://dualmark.dev/docs/ci).

## Programmatic usage

```ts
import { verifyUrl } from "@dualmark/cli";
const report = await verifyUrl("https://example.com/blog/hello");
console.log(report.score, "/", report.maxScore);
```

## What's checked

- `md.fetch` — markdown twin URL is reachable (2xx)
- `md.contentType` — `text/markdown; charset=utf-8`
- `md.tokensHeader` — `X-Markdown-Tokens` is a positive integer
- `md.noindex` — `X-Robots-Tag` includes `noindex`
- `md.vary` — `Vary` includes `Accept`
- `md.body` — body is non-empty
- `md.aeoVersion` — `X-AEO-Version` advertised (recommended)
- `md.nosniff` — `X-Content-Type-Options: nosniff` (recommended)

When negotiation is enabled (default):

- `html.reachable` — HTML URL is 2xx
- `html.linkAlternate` — HTML response advertises markdown twin via `Link rel="alternate"`
- `html.vary` — HTML response `Vary: Accept` (recommended)
- `negotiation.botUa` — GPTBot UA receives markdown
- `negotiation.acceptHeader` — `Accept: text/markdown` receives markdown
- `negotiation.notAcceptable` — Accept that excludes html+markdown returns `406` (recommended)

## License

Apache 2.0
