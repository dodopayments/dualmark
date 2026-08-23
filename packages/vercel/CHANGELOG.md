# @dualmark/vercel

## 0.11.0

### Patch Changes

- 8424d5e: Respect an explicit `Accept: text/html` from AI bot user agents.

  Per AEO spec section 5, UA-based markdown negotiation must not override an explicit `Accept`. Until now every edge and framework adapter served the markdown twin whenever the request came from a known bot UA, even when that request asked for `Accept: text/html`. A search or preview crawler that sends a bot UA together with `Accept: text/html` was therefore handed `text/markdown` with `X-Robots-Tag: noindex` on the canonical URL.

  `@dualmark/core` now exports `shouldServeMarkdown(accept, isBot)`, which keeps the UA-based markdown extension but defers to RFC 7231 negotiation when the client states a concrete format preference. All adapters use it, so a bot UA now stays on HTML when it explicitly requests `text/html`, while `Accept: */*`, no `Accept`, and `Accept: text/markdown` behave exactly as before.

- 6b8572e: Match the HTML `Content-Type` case-insensitively when deciding to inject `Vary: Accept` and the `Link` alternate header.

  HTTP media types are case-insensitive (RFC 7231 §3.1.1.1), but the cloudflare, deno, fastly, netlify and vercel adapters gated markdown-twin advertisement on a case-sensitive `contentType.includes("text/html")`. An upstream that emitted `Content-Type: Text/HTML` (or any non-lowercase spelling) skipped the block, so the negotiable HTML response was returned without `Vary: Accept` — risking a shared cache serving HTML to a markdown client — and without the `Link rel="alternate"` twin. The check now lowercases the header first, matching the astro, nuxt and sveltekit adapters which already did this.

- ccd1929: Match skip prefixes on a path boundary so a page sharing a prefix is not skipped.

  The cloudflare, netlify and vercel adapters tested skip prefixes with a bare `startsWith`, so with the default `["/admin", "/api/", "/_"]` a real page like `/administrator` (or `/admins`) matched `/admin` and was silently excluded from content negotiation, its markdown twin, and the Link header. They now use the same boundary-aware check as the deno and fastly adapters: a prefix matches only the exact path or a `prefix/` subpath (a prefix that already ends in `/` still matches by `startsWith`). Asset paths under `/_` remain covered by the extension list.

- c6fee24: Always set `Vary: Accept` on negotiable HTML responses, even when the Link header is disabled.

  Several adapters tied the `Vary: Accept` header to the Link-header feature flag, so configuring `enableLinkHeader: false` (or `injectLinkHeader: false`) left the HTML response with no `Vary` header. A shared cache keyed only on the URL could then serve an HTML response to a client that asked for markdown, or the reverse.

  The spec (content-negotiation.md section 3) requires `Vary: Accept` on every response whose representation depends on the `Accept` header, which is independent of whether the markdown twin is advertised via a Link header. The cloudflare, netlify, vercel, nextjs and sveltekit adapters now always emit `Vary: Accept` on negotiable HTML and only gate the `Link` header on the flag, matching the deno and fastly adapters which already did this.

- Updated dependencies [8424d5e]
- Updated dependencies [ba3ae37]
- Updated dependencies [f513326]
  - @dualmark/core@0.11.0

## 0.10.0

### Minor Changes

- d2c271d: Add pluggable token estimator with inline `tokenizer` option

  - `estimateTokens(text, { tokenizer })` accepts an inline override function
  - Export `TokenEstimator` type, `setTokenEstimator`, and `resetTokenEstimator` from core
  - Add `tokenizer` option to all adapter configs: Astro, Cloudflare, Deno, Next.js, SvelteKit
  - Astro adapter supports both function tokenizers and module-path strings (e.g. `"./src/aeo-tokenizer.ts"`) for tokenizers that close over external state like js-tiktoken

### Patch Changes

- Updated dependencies [d2c271d]
  - @dualmark/core@0.10.0

## 0.9.0

### Minor Changes

- 0b14fc1: Add `@dualmark/vercel` — Vercel Edge Middleware adapter for the Dualmark AEO framework.
