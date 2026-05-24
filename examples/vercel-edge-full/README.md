# dualmark-example-vercel-edge-full

Reference: a Next.js site deployed to Vercel with `@dualmark/vercel` Edge Middleware, so AI bots get markdown at the edge.

## Architecture

```
┌───────────────────────────────────────────────────────────────┐
│ Vercel Edge Proxy (proxy.ts)                                  │
│   createAEOMiddleware({                                       │
│     upstream: () => NextResponse.next(),                      │
│     fetchAsset: (url, init) => fetch(url, init),              │
│     trailingSlash: "never",                                   │
│     enableLinkHeader: true,                                   │
│   })                                                          │
│                                                               │
│   ↓ AI bot UA + Accept: text/markdown                         │
│   → fetches /posts/foo.md via fetchAsset (subrequest header)  │
│   → subrequest returns NextResponse.next() → static file      │
│   → adapter adds AEO headers, returns to client               │
│                                                               │
│   ↓ Human / unknown UA                                        │
│   → upstream returns NextResponse.next() → origin renders HTML│
│   → adapter appends `Link rel="alternate"` header in-place    │
└───────────────────────────────────────────────────────────────┘
```

## Setup

```bash
bun install
bun run build        # next build → static HTML pages
```

## Run locally

```bash
bun run dev          # http://localhost:3001
```

Test the negotiation:

```bash
# As a browser → HTML with Link header
curl -sI http://localhost:3001/posts/hello

# As ChatGPT → markdown
curl -sI -H "User-Agent: GPTBot/1.0" http://localhost:3001/posts/hello

# Direct .md path → markdown with AEO headers
curl -sI http://localhost:3001/posts/hello.md
```

## Deploy

Push to Vercel — the middleware runs automatically on the edge.

## Verify with the CLI

```bash
bunx @dualmark/cli verify http://localhost:3001/posts/hello
```

## License

Apache 2.0
