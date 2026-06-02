# @dualmark/fastly

Fastly Compute edge adapter for the Dualmark AEO framework. Wraps an upstream backend and transparently serves markdown to AI bots while preserving HTML for human browsers.

## Install

```bash
bun add @dualmark/fastly @dualmark/core
```

## Usage

```ts
/// <reference types="@fastly/js-compute" />

import { createAEOFetchEventHandler } from "@dualmark/fastly";

const handleFetch = createAEOFetchEventHandler({
  backend: "origin_0",
  trailingSlash: "never",
  redirects: {
    internal: { "/old-path": "/new-path" },
    external: { "/login": "https://app.example.com" },
  },
  hooks: {
    onAIRequest: (info) => console.log(`${info.botName} hit ${info.pathname}`),
    onMiss: (info) => console.warn(`miss: ${info.pathname}`),
  },
});

addEventListener("fetch", handleFetch);
```

For the modern Fastly Compute export style, use the request handler directly:

```ts
import { createAEORequestHandler } from "@dualmark/fastly";

const handleRequest = createAEORequestHandler({ backend: "origin_0" });

export default {
  fetch: (event: FetchEvent) => handleRequest(event.request),
};
```

## Production deployment

1. Add a backend in `fastly.toml` and reuse that name in the `backend` option.
2. Build and test locally with `fastly compute serve`.
3. Publish with `fastly compute publish`.

Fastly Compute provides the production `fetch` implementation, so production apps do not need a `fetcher` override. Tests can pass a mock `fetcher` to avoid depending on the Fastly runtime.

Use `markdownBackend` when markdown twins live on a different origin or cache than the HTML site. Do not point `markdownBackend` at an endpoint that routes back through the same Dualmark handler, or `.md` subrequests can loop.

## What it does

1. Trailing-slash enforcement (`never`, `always`, `preserve`)
2. AI bot detection via UA
3. Content negotiation via `Accept`
4. Fetches markdown twins from the configured Fastly backend
5. Internal redirects resolve to the target page's markdown twin
6. External redirects return a markdown notice
7. 406 when neither HTML nor markdown is acceptable
8. Link header injection on HTML responses
9. Falls through to the upstream backend for everything else

## AEO Spec checklist

| Requirement | Fastly adapter behavior |
|---|---|
| Markdown content type | Emits `text/markdown; charset=utf-8` |
| Markdown discovery | Adds `Link rel="alternate"` on HTML responses |
| Negotiation | Honors `Accept: text/markdown` and known AI bot user agents |
| No indexing | Adds `X-Robots-Tag: noindex` on markdown responses |
| Token metadata | Adds `X-Markdown-Tokens` on markdown responses |
| Vary header | Adds or preserves `Vary: Accept` |
| AEO version | Adds `X-AEO-Version: 1.0` |

## License

Apache 2.0
