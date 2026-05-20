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

## License

Apache 2.0
