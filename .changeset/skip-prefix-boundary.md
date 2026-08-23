---
"@dualmark/cloudflare": patch
"@dualmark/netlify": patch
"@dualmark/vercel": patch
---

Match skip prefixes on a path boundary so a page sharing a prefix is not skipped.

The cloudflare, netlify and vercel adapters tested skip prefixes with a bare `startsWith`, so with the default `["/admin", "/api/", "/_"]` a real page like `/administrator` (or `/admins`) matched `/admin` and was silently excluded from content negotiation, its markdown twin, and the Link header. They now use the same boundary-aware check as the deno and fastly adapters: a prefix matches only the exact path or a `prefix/` subpath (a prefix that already ends in `/` still matches by `startsWith`). Asset paths under `/_` remain covered by the extension list.
