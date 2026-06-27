---
"@dualmark/core": minor
"@dualmark/cloudflare": patch
"@dualmark/deno": patch
"@dualmark/fastly": patch
"@dualmark/netlify": patch
"@dualmark/nextjs": patch
"@dualmark/sveltekit": patch
"@dualmark/vercel": patch
"@dualmark/nuxt": patch
---

Respect an explicit `Accept: text/html` from AI bot user agents.

Per AEO spec section 5, UA-based markdown negotiation must not override an explicit `Accept`. Until now every edge and framework adapter served the markdown twin whenever the request came from a known bot UA, even when that request asked for `Accept: text/html`. A search or preview crawler that sends a bot UA together with `Accept: text/html` was therefore handed `text/markdown` with `X-Robots-Tag: noindex` on the canonical URL.

`@dualmark/core` now exports `shouldServeMarkdown(accept, isBot)`, which keeps the UA-based markdown extension but defers to RFC 7231 negotiation when the client states a concrete format preference. All adapters use it, so a bot UA now stays on HTML when it explicitly requests `text/html`, while `Accept: */*`, no `Accept`, and `Accept: text/markdown` behave exactly as before.
