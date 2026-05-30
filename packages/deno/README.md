# @dualmark/deno

Deno Deploy edge adapter for the Dualmark AEO framework. Wraps any upstream Deno fetch handler and transparently serves markdown to AI bots — no changes to your existing site.

> **Adapter naming**: This package is called `@dualmark/deno` (not `@dualmark/deno-deploy`) because it runs under both local `Deno.serve()` and Deno Deploy. The same `createAEOHandler()` call works in both environments only the deployment command changes.

## Install

### Deno (recommended)

`@dualmark/deno` is published to npm. Pull it in via `npm:` specifiers in `deno.json`:

```jsonc
{
  "imports": {
    "@dualmark/deno": "npm:@dualmark/deno@^0.1.0",
    "@dualmark/core": "npm:@dualmark/core@^0.7.0"
  }
}
```

> The `package.json` also declares a `"deno"` export condition, but Deno only consults it when you pass `--conditions=deno`. For everyday use the `npm:` specifier above resolves through npm and uses the ESM build, which is the recommended path.

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

## Deploy to Deno Deploy

Deploy to Deno Deploy using the `deployctl` CLI:

```bash
# Install deployctl
deno install -gArf jsr:@deno/deployctl

# Deploy
deployctl deploy --project=<your-project> main.ts
```

The same `createAEOHandler()` setup works under Deno Deploy's runtime without changes. The `info.completed` promise (used for hook scheduling) is natively supported by the Deno Deploy runtime.

## Options

| Option | Type | Default | Notes |
|---|---|---|---|
| `upstream` | `(req, info) => Response \| Promise<Response>` | **required** | Serves both your HTML and the underlying `.md` twins |
| `redirects.internal` | `Record<string, string>` | `{}` | Pathname → pathname, within same origin |
| `redirects.external` | `Record<string, string>` | `{}` | Pathname → absolute URL |
| `skip.prefixes` | `readonly string[]` | `["/admin", "/api/", "/_"]` | Pass-through paths (exact-or-segment match) |
| `skip.extensions` | `readonly string[]` | `[".js", ".css", ".png", ...]` | Pass-through extensions |
| `trailingSlash` | `"never" \| "always" \| "preserve"` | `"never"` | Normalization policy |
| `headers.cacheControl` | `string` | `"public, max-age=3600"` | Markdown response Cache-Control |
| `hooks.onAIRequest` | `(info: AIRequestInfo) => void \| Promise<void>` | – | Scheduled on `info.completed` (see below) |
| `hooks.onMiss` | `(info: MissInfo) => void \| Promise<void>` | – | Scheduled on `info.completed` (see below) |
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
9. Only `GET` and `HEAD` are intercepted; other methods pass through unchanged
10. Falls through to `upstream` for skip-prefixed paths, asset extensions, and everything else

## Performance

The adapter calls your `upstream` handler differently depending on whether the request produces a cache hit or a miss.

- **Cache hit** (the pathname's `.md` twin exists and is served): `upstream()` is called **once** to fetch the `.md` content for the AI bot.
- **Cache miss** (the pathname has no `.md` twin, so the response falls through): `upstream()` is called **twice** to probe for the `.md` twin (which returns a 404 or error), and again to serve the fallback HTML response.

This double-upstream call on a miss is an inherent cost of the probe-before-serve pattern. For most sites the `.md` twin exists for most paths (the intended use case), so misses are uncommon and the cost is negligible.

> **Subrequest loop warning**: Because `upstream()` is called a second time on a miss, your upstream handler **must not** re-enter the AEO adapter. If you chain `createAEOHandler(upstream)` where `upstream` is itself the AEO adapter, every miss will produce an infinite subrequest loop. Always pass your **origin fetch handler** (the one that reads from disk or forwards to your framework) as `upstream`.

## Hook scheduling

Hooks are scheduled on `info.completed`, which is Deno Deploy's equivalent of Cloudflare's `ctx.waitUntil` — the runtime keeps the isolate alive until the promise resolves. On a stock `Deno.serve` invocation outside Deno Deploy, `info.completed` is also present in modern Deno versions.

If `info.completed` is absent (a mock, an older runtime, or a custom shim), the adapter falls back to scheduling the hook on a resolved microtask (`Promise.resolve().then(...)`), which is fire-and-forget. Hook errors are always caught and logged via `console.error` so a throwing hook never takes down the request pipeline.

## Safe-method semantics

Only `GET` and `HEAD` requests trigger negotiation, trailing-slash normalization, and `.md` lookups. `POST`, `PUT`, `PATCH`, `DELETE`, and `OPTIONS` flow through to `upstream` unchanged, preserving the original method and body end-to-end.

## Differences from `@dualmark/cloudflare`

| Concept | Cloudflare Workers | Deno Deploy |
|---|---|---|
| Static assets | `env.ASSETS.fetch()` binding | User-provided `upstream(req, info)` callback |
| Background work | `ctx.waitUntil(promise)` | `info.completed.then(promise)` |
| Built-in analytics | `AnalyticsEngineDataset` | **Not provided** — use the `onAIRequest` hook with the telemetry of your choice |
| Geo data | `cf-ipcountry` header | Standard `x-forwarded-for` / `info.remoteAddr.hostname` |

## License

Apache 2.0
