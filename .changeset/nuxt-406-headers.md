---
"@dualmark/nuxt": patch
---

Set the required headers on the Nuxt 406 response.

When a request explicitly excluded both `text/html` and `text/markdown`, the Nuxt adapter returned `new Response('Not Acceptable', { status: 406 })` with no headers. The spec (content-negotiation.md section 4) requires a 406 to set `Vary: Accept`, and it should carry a `Content-Type` and a body listing the supported types. The 406 now matches the other adapters: `Content-Type: text/plain; charset=utf-8`, `Vary: Accept`, and a supported-types body. This applies to both the generated collection middleware and the runtime middleware.
