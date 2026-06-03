# @dualmark/vercel

Vercel Edge Middleware adapter for the Dualmark AEO framework. Wraps any upstream handler and transparently serves markdown to AI bots at the edge — no changes to your existing site.

## Install

```bash
bun add @dualmark/vercel @dualmark/core
```

## Usage

```ts
// proxy.ts
import { NextResponse } from "next/server";
import { createAEOMiddleware } from "@dualmark/vercel";

const middleware = createAEOMiddleware({
  upstream: async () => NextResponse.next(),
  fetchAsset: async (url, init) => fetch(url.toString(), init),
  trailingSlash: "never",
  enableLinkHeader: true,
  hooks: {
    onAIRequest: (info) => console.log(`${info.botName} hit ${info.pathname}`),
    onMiss: (info) => console.warn(`miss: ${info.pathname}`),
  },
});

export default middleware;

export const config = {
  matcher: [
    {
      source: "/((?!_next/|favicon.ico).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
```

## How it works on Vercel

Vercel Edge Middleware re-triggers for same-origin `fetch()` calls. To prevent infinite loops, the adapter adds an `x-dualmark-subrequest` header to internal `fetchAsset` calls and short-circuits when it detects a subrequest — returning `NextResponse.next()` so Vercel serves the static file directly.

- **`upstream`** should return `NextResponse.next()` for browser requests. The adapter injects Link headers directly on the response object.
- **`fetchAsset`** should forward the optional `RequestInit` to `fetch()` so the subrequest header is included.

## Options

| Option             | Type                                | Default   | Description                                                 |
| ------------------ | ----------------------------------- | --------- | ----------------------------------------------------------- |
| `upstream`         | `(req) => Response`                 | —         | Handler for non-bot requests (return `NextResponse.next()`) |
| `fetchAsset`       | `(url, init?) => Response`          | —         | Fetch a `.md` file by URL (forward `init` to `fetch`)       |
| `trailingSlash`    | `"never" \| "always" \| "preserve"` | `"never"` | Trailing slash mode                                         |
| `enableLinkHeader` | `boolean`                           | `true`    | Inject `Link rel=alternate` on HTML responses               |
| `hooks`            | `{ onAIRequest?, onMiss? }`         | —         | Lifecycle callbacks for AI request events                   |
| `redirects`        | `{ internal?, external? }`          | —         | Redirect rules for AI bots                                  |
| `skip`             | `{ prefixes?, extensions? }`        | —         | Paths to skip entirely                                      |
| `headers`          | `{ cacheControl? }`                 | —         | Custom response headers                                     |

## What it does

1. Subrequest detection to prevent `fetch()` infinite loops on Vercel
2. Trailing-slash enforcement (configurable: `never`, `always`, `preserve`)
3. AI bot detection via UA
4. Content negotiation via Accept header
5. Serves pre-built `.md` via `fetchAsset` with full AEO headers
6. Internal redirects: routes to target's `.md`
7. External redirects: returns markdown notice
8. 406 when neither HTML nor markdown is acceptable
9. Link header injection on upstream `NextResponse.next()` for HTML responses
10. Analytics hooks (onAIRequest / onMiss)

## License

Apache 2.0
