# @dualmark/\* v0.11.0

This release hardens content negotiation to match the AEO spec, fixes several markdown-generation and caching correctness bugs, and promotes the Fastly Compute adapter to the shared version line.

All published packages move to **0.11.0**: `@dualmark/core`, `converters`, `astro`, `nextjs`, `sveltekit`, `nuxt`, `cloudflare`, `netlify`, `vercel`, `deno`, `fastly`, `cli`.

## ✨ Features

- **`@dualmark/core` — `shouldServeMarkdown(accept, isBot)`** _(minor)_. New exported helper that encodes AEO spec §5: UA-based markdown negotiation now defers to an explicit `Accept`. A known AI bot still gets the markdown twin for `Accept: */*`, no `Accept`, or `Accept: text/markdown`, but is kept on HTML when it explicitly asks for `text/html` — so crawlers/preview bots are no longer handed `noindex` markdown on the canonical URL.
- **`@dualmark/fastly` — Initial Fastly Compute adapter** _(minor)_. Edge adapter for Fastly Compute, now on the shared release line.

## 🐛 Fixes

### Content negotiation & caching (edge/framework adapters)

- **Respect explicit `Accept: text/html` from bot UAs** — applied across `cloudflare`, `deno`, `fastly`, `netlify`, `nextjs`, `sveltekit`, `vercel`, `nuxt` via the new core helper.
- **Always set `Vary: Accept` on negotiable HTML, independent of the Link header** — `cloudflare`, `netlify`, `vercel`, `nextjs`, `sveltekit`. Previously `enableLinkHeader: false` / `injectLinkHeader: false` dropped `Vary`, risking a shared cache serving HTML to a markdown client (or vice-versa). Now spec §3-compliant.
- **Match the HTML `Content-Type` case-insensitively** — `cloudflare`, `deno`, `fastly`, `netlify`, `vercel`. An upstream emitting `Content-Type: Text/HTML` no longer bypasses `Vary: Accept` and the markdown-twin `Link` header (RFC 7231 §3.1.1.1).
- **Skip prefixes match on a path boundary** — `cloudflare`, `netlify`, `vercel`. A real page like `/administrator` is no longer wrongly skipped by the default `/admin` prefix; only the exact path or a `prefix/` subpath is skipped.
- **Nuxt 406 responses now carry the required headers** — `nuxt`. A 406 (when `Accept` excludes both HTML and markdown) now sets `Content-Type: text/plain; charset=utf-8`, `Vary: Accept`, and a supported-types body, matching the other adapters (spec §4).

### Markdown generation (`@dualmark/core`, `@dualmark/converters`)

- **`cleanBody` no longer leaks raw multi-line tags** — the tag-replacement regex now uses the dotAll (`s`) flag, so a `<Highlighted>…</Highlighted>` (or custom `htmlTagReplacements`) spanning multiple lines is converted instead of leaking raw markup, while adjacent tags stay separate.
- **`toMarkdownPath` no longer doubles the extension** on a `.md` path with a trailing slash (`/blog/post.md/` → `/blog/post.md`, not `…md.md`).
- **Blog converter no longer turns the last body line into a heading** — a blank line now separates body and footer, so the trailing `---` renders as a thematic break instead of a setext H2.

## 📦 Upgrade notes

- Minor bump; no breaking API changes. Safe to update all `@dualmark/*` packages together.
- If you relied on a bot UA always receiving markdown even when it sent `Accept: text/html`, that behavior changed (now spec-compliant) — bots must omit `Accept`, send `*/*`, or send `text/markdown` to get the twin.
- `@dualmark/fastly` version jumps `0.1.0 → 0.11.0` to align with the rest of the suite (no functional break).

```bash
bun add @dualmark/core@0.11.0
# or the adapter(s) you use, e.g.
bun add @dualmark/nextjs@0.11.0 @dualmark/cloudflare@0.11.0
```
