# dualmark-example-nextjs-app-router

End-to-end Next.js App Router example built on the dedicated **`@dualmark/nextjs`** adapter.

## What this shows

A minimal Next.js site where every page has a markdown twin AI agents can read, in three small files:

```
proxy.ts                      ← createDualmarkMiddleware()
next.config.mjs               ← withDualmark()
app/md/[...path]/route.ts     ← createDualmarkRouteHandler()
app/llms.txt/route.ts         ← createLlmsTxtHandler()
```

_On Next.js ≤15, name the file `middleware.ts` instead of `proxy.ts` — body is identical._

The proxy rewrites bot/`Accept: text/markdown`/`.md` traffic to an internal `/md/<path>` namespace where the route handler factory dispatches to your collections, static pages, and parameterized routes.

```
┌─────────────────────────────────────────────────────────────┐
│ proxy.ts (createDualmarkMiddleware)                         │
│   - if path ends in .md     → rewrite to /md/<path>        │
│   - if AI bot UA OR Accept: text/markdown                   │
│       → rewrite to /md/<path>                               │
│   - if Accept rules out html+md → 406                       │
│   - else (HTML) → next() + Link rel=alternate header        │
└─────────────────────────────────────────────────────────────┘

app/
├── page.tsx                  → /              (HTML home)
├── posts/
│   ├── page.tsx              → /posts         (HTML)
│   └── [slug]/page.tsx       → /posts/<slug>  (HTML)
├── md/[...path]/route.ts     → /md/<*path>    (markdown handler;
│                                              never reached directly,
│                                              only via proxy rewrite)
└── llms.txt/route.ts         → /llms.txt
```

> **Why the `/md/` indirection?** Next.js's route type generator and
> static prerender can't currently express dotted segments like `[slug].md`.
> A separate `md/` namespace + proxy rewrite is the cleanest pattern that
> preserves negotiation for both `Accept: text/markdown` and direct `.md` URLs
> while staying type-safe. It's customizable via `internalNamespace`.

## Run

```bash
bun install
bun run dev               # http://localhost:3000 (recommended for verify)
bun run build             # production build (uses generateStaticParams)
bun run start             # serve production build
```

## Verify

In one terminal: `bun run dev`. In another:

```bash
# As browser → HTML with Link header
curl -sI http://localhost:3000/posts/hello

# As ChatGPT → markdown (proxy rewrites to /md/posts/hello)
curl -sI -H "User-Agent: GPTBot/1.0" -H "Accept: text/markdown" http://localhost:3000/posts/hello

# Direct .md → markdown
curl -sI http://localhost:3000/posts/hello.md

# Conformance
bun run verify           # → Score 120/125 under `next dev`
```

> **Production note**: `next start` serves prerendered 404s for unknown slugs
> (like `/posts/hello.md`) from cache *before* invoking the proxy, which can
> shadow the rewrite. On Vercel and other production-grade hosts, the proxy
> runs at the edge before any cache layer, so this isn't an issue. For local
> conformance verification, use `bun run dev`.

## License

Apache 2.0
