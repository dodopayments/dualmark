# @dualmark/fastly

## 0.11.0

### Minor Changes

- 478b5f3: Initial Fastly Compute adapter.

### Patch Changes

- 8424d5e: Respect an explicit `Accept: text/html` from AI bot user agents.

  Per AEO spec section 5, UA-based markdown negotiation must not override an explicit `Accept`. Until now every edge and framework adapter served the markdown twin whenever the request came from a known bot UA, even when that request asked for `Accept: text/html`. A search or preview crawler that sends a bot UA together with `Accept: text/html` was therefore handed `text/markdown` with `X-Robots-Tag: noindex` on the canonical URL.

  `@dualmark/core` now exports `shouldServeMarkdown(accept, isBot)`, which keeps the UA-based markdown extension but defers to RFC 7231 negotiation when the client states a concrete format preference. All adapters use it, so a bot UA now stays on HTML when it explicitly requests `text/html`, while `Accept: */*`, no `Accept`, and `Accept: text/markdown` behave exactly as before.

- 6b8572e: Match the HTML `Content-Type` case-insensitively when deciding to inject `Vary: Accept` and the `Link` alternate header.

  HTTP media types are case-insensitive (RFC 7231 §3.1.1.1), but the cloudflare, deno, fastly, netlify and vercel adapters gated markdown-twin advertisement on a case-sensitive `contentType.includes("text/html")`. An upstream that emitted `Content-Type: Text/HTML` (or any non-lowercase spelling) skipped the block, so the negotiable HTML response was returned without `Vary: Accept` — risking a shared cache serving HTML to a markdown client — and without the `Link rel="alternate"` twin. The check now lowercases the header first, matching the astro, nuxt and sveltekit adapters which already did this.

- Updated dependencies [8424d5e]
- Updated dependencies [ba3ae37]
- Updated dependencies [f513326]
  - @dualmark/core@0.11.0
