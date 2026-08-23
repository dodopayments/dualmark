# @dualmark/sveltekit

## 0.11.0

### Patch Changes

- 8424d5e: Respect an explicit `Accept: text/html` from AI bot user agents.

  Per AEO spec section 5, UA-based markdown negotiation must not override an explicit `Accept`. Until now every edge and framework adapter served the markdown twin whenever the request came from a known bot UA, even when that request asked for `Accept: text/html`. A search or preview crawler that sends a bot UA together with `Accept: text/html` was therefore handed `text/markdown` with `X-Robots-Tag: noindex` on the canonical URL.

  `@dualmark/core` now exports `shouldServeMarkdown(accept, isBot)`, which keeps the UA-based markdown extension but defers to RFC 7231 negotiation when the client states a concrete format preference. All adapters use it, so a bot UA now stays on HTML when it explicitly requests `text/html`, while `Accept: */*`, no `Accept`, and `Accept: text/markdown` behave exactly as before.

- c6fee24: Always set `Vary: Accept` on negotiable HTML responses, even when the Link header is disabled.

  Several adapters tied the `Vary: Accept` header to the Link-header feature flag, so configuring `enableLinkHeader: false` (or `injectLinkHeader: false`) left the HTML response with no `Vary` header. A shared cache keyed only on the URL could then serve an HTML response to a client that asked for markdown, or the reverse.

  The spec (content-negotiation.md section 3) requires `Vary: Accept` on every response whose representation depends on the `Accept` header, which is independent of whether the markdown twin is advertised via a Link header. The cloudflare, netlify, vercel, nextjs and sveltekit adapters now always emit `Vary: Accept` on negotiable HTML and only gate the `Link` header on the flag, matching the deno and fastly adapters which already did this.

- Updated dependencies [8611bed]
- Updated dependencies [8424d5e]
- Updated dependencies [ba3ae37]
- Updated dependencies [f513326]
  - @dualmark/converters@0.11.0
  - @dualmark/core@0.11.0

## 0.10.0

### Minor Changes

- 2d8f839: Add new OpenAPI-aware `api-reference` converter with `fromOpenAPI` helper.
- d2c271d: Add pluggable token estimator with inline `tokenizer` option

  - `estimateTokens(text, { tokenizer })` accepts an inline override function
  - Export `TokenEstimator` type, `setTokenEstimator`, and `resetTokenEstimator` from core
  - Add `tokenizer` option to all adapter configs: Astro, Cloudflare, Deno, Next.js, SvelteKit
  - Astro adapter supports both function tokenizers and module-path strings (e.g. `"./src/aeo-tokenizer.ts"`) for tokenizers that close over external state like js-tiktoken

### Patch Changes

- Updated dependencies [2d8f839]
- Updated dependencies [d2c271d]
  - @dualmark/converters@0.10.0
  - @dualmark/core@0.10.0

## 0.9.0

### Minor Changes

- 08bf7c8: Add the SvelteKit adapter with generated markdown endpoints, llms.txt support, and a handle hook for Dualmark negotiation.
