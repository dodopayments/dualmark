**The AEO infrastructure your marketing site is missing.** This release ships a new Fastly Compute adapter, adds a spec-compliant negotiation primitive to core, and hardens content negotiation and markdown generation across every adapter. All `@dualmark/*` packages are version-linked and ship at `0.11.0`.

## Highlights

### New: Fastly adapter — `@dualmark/fastly@0.11.0`

Run Dualmark on **Fastly Compute**. Natively proxies to Fastly backends and serves clean markdown twins to AI bots at the edge via content negotiation, with background lifecycle hooks.

```bash
bun add @dualmark/fastly @dualmark/core
```

Verified at **125/125** conformance under `fastly compute serve`. See [`examples/fastly-compute`](https://github.com/dodopayments/dualmark/tree/main/examples/fastly-compute).

### New: spec §5 negotiation primitive — `@dualmark/core@0.11.0`

Core now exports `shouldServeMarkdown(accept, isBot)`, which keeps the UA-based markdown extension but defers to RFC 7231 negotiation when the client states a concrete format preference. Per AEO spec §5, UA detection must not override an explicit `Accept`: a known AI bot still receives the markdown twin for `Accept: */*`, no `Accept`, or `Accept: text/markdown`, but is kept on HTML when it explicitly requests `text/html`. Every edge and framework adapter now uses it, so a bot UA sending `Accept: text/html` is no longer handed `text/markdown` with `X-Robots-Tag: noindex` on the canonical URL.

### Fixed: content negotiation & caching across adapters

- **`Vary: Accept` is now always set on negotiable HTML**, independent of the Link header (`cloudflare`, `netlify`, `vercel`, `nextjs`, `sveltekit`). Configuring `enableLinkHeader: false` / `injectLinkHeader: false` previously dropped `Vary`, so a shared cache keyed on URL could serve HTML to a markdown client (or the reverse). Now spec §3-compliant.
- **HTML `Content-Type` is matched case-insensitively** (`cloudflare`, `deno`, `fastly`, `netlify`, `vercel`). An upstream emitting `Content-Type: Text/HTML` no longer bypasses `Vary: Accept` and the markdown-twin `Link` header (RFC 7231 §3.1.1.1).
- **Skip prefixes match on a path boundary** (`cloudflare`, `netlify`, `vercel`). A real page like `/administrator` is no longer wrongly excluded by the default `/admin` prefix — only the exact path or a `prefix/` subpath is skipped.
- **Nuxt 406 responses now carry the required headers** (`nuxt`). A 406 (when `Accept` excludes both HTML and markdown) now sets `Content-Type: text/plain; charset=utf-8`, `Vary: Accept`, and a supported-types body, matching the other adapters (spec §4).

### Fixed: markdown generation — `@dualmark/core@0.11.0`, `@dualmark/converters@0.11.0`

- **`cleanBody` no longer leaks raw multi-line tags** — the tag-replacement regex uses the dotAll (`s`) flag, so a `<Highlighted>…</Highlighted>` (or custom `htmlTagReplacements`) spanning multiple lines is converted instead of leaking raw markup, while adjacent tags stay separate.
- **`toMarkdownPath` no longer doubles the extension** on a `.md` path with a trailing slash (`/blog/post.md/` → `/blog/post.md`, not `…md.md`).
- **Blog converter no longer turns the last body line into a heading** — a blank line now separates body and footer, so the trailing `---` renders as a thematic break instead of a setext H2.

## Changes by package

| Package | Version | Type | Change |
|---|---|---|---|
| `@dualmark/fastly` | `0.11.0` | minor | **New** Fastly Compute adapter; respect explicit `Accept`; case-insensitive HTML match |
| `@dualmark/core` | `0.11.0` | minor | New `shouldServeMarkdown()` (spec §5); `cleanBody` multi-line tags; `toMarkdownPath` trailing-slash fix |
| `@dualmark/cloudflare` | `0.11.0` | patch | Respect explicit `Accept`; `Vary: Accept` independent of Link; case-insensitive HTML match; skip-prefix boundary |
| `@dualmark/netlify` | `0.11.0` | patch | Respect explicit `Accept`; `Vary: Accept` independent of Link; case-insensitive HTML match; skip-prefix boundary |
| `@dualmark/vercel` | `0.11.0` | patch | Respect explicit `Accept`; `Vary: Accept` independent of Link; case-insensitive HTML match; skip-prefix boundary |
| `@dualmark/nextjs` | `0.11.0` | patch | Respect explicit `Accept`; `Vary: Accept` independent of Link |
| `@dualmark/sveltekit` | `0.11.0` | patch | Respect explicit `Accept`; `Vary: Accept` independent of Link |
| `@dualmark/deno` | `0.11.0` | patch | Respect explicit `Accept`; case-insensitive HTML match |
| `@dualmark/nuxt` | `0.11.0` | patch | Respect explicit `Accept`; required headers on the 406 response |
| `@dualmark/converters` | `0.11.0` | patch | Blog converter no longer turns the last body line into a heading |
| `@dualmark/astro` | `0.11.0` | patch | Bump for `@dualmark/core@0.11.0` |
| `@dualmark/cli` | `0.11.0` | patch | Bump for `@dualmark/core@0.11.0` |

Nine end-to-end adapters now ship: **Astro, Next.js, SvelteKit, Nuxt, Cloudflare, Deno, Vercel, Netlify, Fastly.**

## Upgrade notes

- Minor bump; no breaking API changes. Safe to update all `@dualmark/*` packages together.
- Behavior change: if you relied on a bot UA always receiving markdown even when it sent `Accept: text/html`, bots must now omit `Accept`, send `*/*`, or send `text/markdown` to get the twin (spec §5).
- `@dualmark/fastly` jumps `0.1.0 → 0.11.0` to align with the rest of the suite (no functional break).

**Full Changelog**: https://github.com/dodopayments/dualmark/compare/v0.10.0...v0.11.0
