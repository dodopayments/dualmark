---
"@dualmark/cloudflare": patch
"@dualmark/deno": patch
"@dualmark/fastly": patch
"@dualmark/netlify": patch
"@dualmark/vercel": patch
---

Match the HTML `Content-Type` case-insensitively when deciding to inject `Vary: Accept` and the `Link` alternate header.

HTTP media types are case-insensitive (RFC 7231 §3.1.1.1), but the cloudflare, deno, fastly, netlify and vercel adapters gated markdown-twin advertisement on a case-sensitive `contentType.includes("text/html")`. An upstream that emitted `Content-Type: Text/HTML` (or any non-lowercase spelling) skipped the block, so the negotiable HTML response was returned without `Vary: Accept` — risking a shared cache serving HTML to a markdown client — and without the `Link rel="alternate"` twin. The check now lowercases the header first, matching the astro, nuxt and sveltekit adapters which already did this.
