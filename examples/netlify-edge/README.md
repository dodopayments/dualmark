# Dualmark Netlify Edge Example

A full-stack example showing how `@dualmark/netlify` serves AI bots markdown at the edge via Netlify Edge Functions, while humans see normal HTML.

## Stack

- **Astro** — static-site generator (HTML + `.md` twins via `@dualmark/astro`)
- **Netlify Edge Functions** — `@dualmark/netlify` adapter intercepts requests at the edge
- **Dualmark Core** — bot detection, content negotiation, path mapping

## Quick start

```bash
# From the monorepo root
bun install

# Build the static site (generates dist/ with HTML + .md files)
cd examples/netlify-edge
bun run build

# Start the Netlify dev server
bun run netlify:dev
```

## Testing with `dualmark verify`

Once `netlify dev` is running (default: `http://localhost:8888`):

```bash
# From the monorepo root — run the AEO conformance checker
npx dualmark verify http://localhost:8888/blog/edge-aeo
```

This runs the full AEO spec check catalogue against the page and produces a score out of 125.

### What the checker tests (125 points total)

| Check | Points | What it validates |
|---|---|---|
| `md.fetch` | 20 | Markdown twin reachable at `/blog/edge-aeo.md` |
| `md.contentType` | 10 | `Content-Type: text/markdown; charset=utf-8` |
| `md.tokensHeader` | 10 | `X-Markdown-Tokens` header with integer ≥ 1 |
| `md.noindex` | 10 | `X-Robots-Tag` contains `noindex` |
| `md.vary` | 10 | `Vary: Accept` on markdown response |
| `md.body` | 10 | Non-empty markdown body |
| `md.aeoVersion` | 5 | `X-AEO-Version` header present |
| `md.nosniff` | 5 | `X-Content-Type-Options: nosniff` |
| `html.reachable` | 5 | HTML page returns 2xx |
| `html.linkAlternate` | 10 | `Link rel="alternate"` header on HTML response |
| `html.vary` | 5 | `Vary: Accept` on HTML response |
| `negotiation.botUa` | 10 | GPTBot UA receives markdown |
| `negotiation.acceptHeader` | 10 | `Accept: text/markdown` receives markdown |
| `negotiation.notAcceptable` | 5 | Unsupported Accept → 406 |
| **Total** | **125** | |

Target: **≥ 120/125**

## Architecture

```
Request → Netlify Edge (aeo.ts)
           ├─ AI bot? → serve /blog/edge-aeo.md with AEO headers
           ├─ Accept: text/markdown? → same
           └─ Human? → context.next() → dist/blog/edge-aeo.html
                        + inject Link: <…>; rel="alternate"
```

## License

Apache 2.0
