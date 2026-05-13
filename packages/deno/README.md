# @dualmark/deno

Deno Deploy edge adapter for the Dualmark AEO framework. Wraps any upstream Deno fetch handler and transparently serves markdown to AI bots — no changes to your existing site.

## Install

### Deno (recommended)

`@dualmark/deno` is published to npm but exports the `"types"` condition first, so you can pull it in via npm specifiers in `deno.json`:

```jsonc
{
  "imports": {
    "@dualmark/deno": "npm:@dualmark/deno@^0.5.2",
    "@dualmark/core": "npm:@dualmark/core@^0.5.2"
  }
}
```

### Node / Bun (for local tooling and tests)

```bash
bun add @dualmark/deno @dualmark/core
# or
npm install @dualmark/deno @dualmark/core
```

## Usage

```ts
// main.ts
import { createAEOHandler } from "@dualmark/deno";

const upstream = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  let pathname = url.pathname;
  if (pathname === "/") pathname = "/index.html";
  if (pathname === "/pricing") pathname = "/pricing.html";

  try {
    const body = await Deno.readTextFile(`./content${pathname}`);
    const contentType = pathname.endsWith(".md") ? "text/markdown" : "text/html";
    return new Response(body, { headers: { "content-type": contentType } });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
};

const handler = createAEOHandler({
  upstream,

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

Deno.serve(handler);
```

Run with:

```bash
deno run --allow-read --allow-net main.ts
```

## Options

| Option | Type | Default | Notes |
|---|---|---|---|
| `upstream` | `(req, info) => Response \| Promise<Response>` | **required** | Serves both your HTML and the underlying `.md` twins |
| `redirects.internal` | `Record<string, string>` | `{}` | Pathname → pathname, within same origin |
| `redirects.external` | `Record<string, string>` | `{}` | Pathname → absolute URL |
| `skip.prefixes` | `readonly string[]` | `["/admin", "/api/", "/_"]` | Pass-through paths |
| `skip.extensions` | `readonly string[]` | `[".js", ".css", ".png", ...]` | Pass-through extensions |
| `trailingSlash` | `"never" \| "always" \| "preserve"` | `"never"` | Normalization policy |
| `headers.cacheControl` | `string` | `"public, max-age=3600"` | Markdown response Cache-Control |
| `hooks.onAIRequest` | `(info: AIRequestInfo) => void \| Promise<void>` | – | Scheduled on `info.completed` |
| `hooks.onMiss` | `(info: MissInfo) => void \| Promise<void>` | – | Scheduled on `info.completed` |
| `enableLinkHeader` | `boolean` | `true` | Inject `Link: …; rel="alternate"; type="text/markdown"` |

## What it does

1. Trailing-slash enforcement (configurable: `never`, `always`, `preserve`)
2. AI bot detection via UA (from `@dualmark/core`'s registry)
3. Content negotiation via Accept header (RFC 7231 §5.3.2)
4. Serves the `.md` twin via your `upstream` handler with full AEO headers
5. Internal redirects: routes to the target's `.md`
6. External redirects: returns a markdown notice
7. `406 Not Acceptable` when neither HTML nor markdown is acceptable
8. `Link: <…>; rel="alternate"; type="text/markdown"` injection on HTML responses
9. `onAIRequest` / `onMiss` lifecycle hooks scheduled on `info.completed` (Deno's equivalent of `ctx.waitUntil`)
10. Falls through to `upstream` for everything else

## Differences from `@dualmark/cloudflare`

| Concept | Cloudflare Workers | Deno Deploy |
|---|---|---|
| Static assets | `env.ASSETS.fetch()` binding | User-provided `upstream(req, info)` callback |
| Background work | `ctx.waitUntil(promise)` | `info.completed.then(promise)` |
| Built-in analytics | `AnalyticsEngineDataset` | **Not provided** — use the `onAIRequest` hook with the telemetry of your choice |
| Geo data | `cf-ipcountry` header | Standard `x-forwarded-for` / `info.remoteAddr.hostname` |

## License

Apache 2.0
