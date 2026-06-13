# @dualmark/fastly

Fastly Compute edge adapter for the Dualmark Answer Engine Optimization (AEO) framework.

## Installation

```bash
npm install @dualmark/fastly @dualmark/core
```

## Usage

Create your Fastly Compute handler using `createAEOFetchEventHandler`.

```javascript
import { createAEOFetchEventHandler } from "@dualmark/fastly";

const handler = createAEOFetchEventHandler({
  backend: "my_html_backend",
  markdownBackend: "my_markdown_backend", // Optional, defaults to backend
});

addEventListener("fetch", (event) => {
  event.respondWith(handler(event));
});
```

## Fastly Backend Setup

Unlike other serverless environments where you provide an `upstream` handler function, Fastly routes requests to explicit **Backends**. 

You must define your backends in your `fastly.toml` or via the Fastly dashboard:

```toml
[setup.backends.my_html_backend]
  address = "example.com"
  port = 443
```

Pass the name of this backend to the adapter via the `backend` option.

### `markdownBackend` Explanation

By default, the adapter will look for `.md` files on the same backend defined in `backend`. However, you can separate your markdown serving (e.g., from an AWS S3 bucket) from your HTML serving (e.g., a dynamic application).

Provide `markdownBackend: "your_s3_backend"` to tell the adapter to fetch `.md` requests from a different origin.

## Production Deployment

When deploying to Fastly Compute, ensure you've configured the correct backend addresses for production environments. 

Use the Fastly CLI to deploy your service:
```bash
fastly compute publish
```

> [!WARNING]
> **Warning about backend loops:** If you accidentally misconfigure your `backend` to point back to your Fastly service itself (rather than the origin serving the content), it can create an infinite fetch loop. Ensure the `backend` name corresponds to the external origin serving your HTML or Markdown.

## AEO Spec Checklist

This adapter handles the following [Dualmark AEO specifications](https://github.com/dodopayments/dualmark):
- [x] AI bot UA detection
- [x] `Accept: text/markdown` negotiation
- [x] `406 Not Acceptable` handling
- [x] `.md` asset passthrough
- [x] Internal & external redirects
- [x] `Link: rel="alternate"` header injection on HTML responses
- [x] `Vary: Accept` header injection
- [x] Trailing slash normalization
