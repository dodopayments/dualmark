---
"@dualmark/cloudflare": patch
"@dualmark/netlify": patch
"@dualmark/vercel": patch
"@dualmark/nextjs": patch
"@dualmark/sveltekit": patch
---

Always set `Vary: Accept` on negotiable HTML responses, even when the Link header is disabled.

Several adapters tied the `Vary: Accept` header to the Link-header feature flag, so configuring `enableLinkHeader: false` (or `injectLinkHeader: false`) left the HTML response with no `Vary` header. A shared cache keyed only on the URL could then serve an HTML response to a client that asked for markdown, or the reverse.

The spec (content-negotiation.md section 3) requires `Vary: Accept` on every response whose representation depends on the `Accept` header, which is independent of whether the markdown twin is advertised via a Link header. The cloudflare, netlify, vercel, nextjs and sveltekit adapters now always emit `Vary: Accept` on negotiable HTML and only gate the `Link` header on the flag, matching the deno and fastly adapters which already did this.
