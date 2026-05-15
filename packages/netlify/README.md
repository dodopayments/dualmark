# @dualmark/netlify

Netlify Edge Functions adapter for the Dualmark AEO framework. Wraps `context.next()` and transparently serves pre-built markdown to AI bots — no changes to your existing site.

## Install

```bash
bun add @dualmark/netlify @dualmark/core
```

## Usage

Create a Netlify Edge Function that runs on all paths:

```ts
// netlify/edge-functions/aeo.ts
import { createAEOWorker } from "@dualmark/netlify";

export default createAEOWorker({
  redirects: {
    internal: { "/old-path": "/new-path" },
    external: { "/login": "https://app.example.com" },
  },

  trailingSlash: "never",

  hooks: {
    onAIRequest: (info) => console.log(`${info.botName} hit ${info.pathname}`),
    onMiss: (info) => console.warn(`miss: ${info.pathname}`),
  },
});

export const config = { path: "/*" };
```

## Deploy to Netlify

Add the edge function routing to your `netlify.toml` to ensure it runs before your static assets are served:

```toml
[[edge_functions]]
  function = "aeo"
  path = "/*"
```

Then, build your markdown and HTML files using your framework's standard build command before deploying. For example:

```bash
bun run build
netlify deploy --prod
```

## How it works

The adapter sits at the edge and intercepts every incoming request:

1. **Trailing-slash enforcement** (configurable: `never`, `always`, `preserve`)
2. **AI bot detection** via `User-Agent` (GPTBot, ClaudeBot, PerplexityBot, etc.)
3. **Content negotiation** via `Accept: text/markdown`
4. **Serves pre-built `.md`** from static assets with full AEO headers
5. **Internal redirects**: routes to the target path's `.md`
6. **External redirects**: returns a markdown notice pointing to the external URL
7. **406** when neither HTML nor markdown is acceptable
8. **Link header injection** (`<…>; rel="alternate"; type="text/markdown"`) on HTML responses to non-bot clients
9. **Hooks** — `onAIRequest` and `onMiss` for custom analytics or logging
10. **Falls through** to `context.next()` for everything else

## Asset resolution

The adapter fetches `.md` files using `fetch()`, which in Netlify's Deno runtime resolves same-origin paths against the site's deployed static files. Place your markdown files alongside your HTML output:

```
dist/
  blog/
    hello-world.html   ← served to browsers
    hello-world.md     ← served to AI bots
  index.html
  index.md
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `assets` | `AssetsFetcher` | `fetch` | Custom fetcher for `.md` files (useful for testing) |
| `redirects.internal` | `Record<string, string>` | `{}` | Internal path remaps |
| `redirects.external` | `Record<string, string>` | `{}` | External URL redirects |
| `skip.prefixes` | `string[]` | `["/admin", "/api/", "/_"]` | Paths to bypass |
| `skip.extensions` | `string[]` | `.js`, `.css`, `.png`, … | Extensions to bypass |
| `trailingSlash` | `"never" \| "always" \| "preserve"` | `"never"` | Slash policy |
| `headers.cacheControl` | `string` | `"public, max-age=3600"` | `Cache-Control` on markdown responses |
| `hooks.onAIRequest` | `(info) => void` | — | Called on every markdown hit |
| `hooks.onMiss` | `(info) => void` | — | Called when no `.md` found for a bot |
| `enableLinkHeader` | `boolean` | `true` | Inject `Link` alternate header on HTML |

## License

Apache 2.0
