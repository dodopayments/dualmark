# @dualmark/cloudflare

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

## 0.7.0

### Patch Changes

- Updated dependencies [6155878]
  - @dualmark/core@0.7.0

## 0.5.2

### Patch Changes

- b3ad299: Release pipeline now publishes with **npm provenance attestation**. Every
  `@dualmark/*` tarball on npmjs.com is now Sigstore-signed and traceable back
  to the exact GitHub Actions workflow run + commit SHA that built it. Visible
  as a "Provenance" badge on each package's npm page.

  No behavior change inside the packages themselves — this is a supply-chain
  hardening release. Consumers can verify with `npm audit signatures`.

- Updated dependencies [b3ad299]
  - @dualmark/core@0.5.2

## 0.5.0

### Patch Changes

- 9f9f1d1: ## New: `@dualmark/nextjs` — first-class Next.js 15 App Router adapter

  Closes #4. Same one-line install as `@dualmark/astro`:
  - `withDualmark(nextConfig, options)` — wraps `next.config.mjs`
  - `createDualmarkMiddleware(options)` — drop-in `middleware.ts`
  - `createDualmarkRouteHandler(options)` — catch-all markdown twin route handler with `generateStaticParams`
  - `createLlmsTxtHandler(options)` — `/llms.txt` route handler

  Mirrors `@dualmark/astro`'s `collections` / `staticPages` / `parameterizedRoutes` config shape so users can copy their config across frameworks. Built-in converter names work identically. Tree-shakeable, zero runtime deps beyond `@dualmark/core` and `@dualmark/converters`.

  `examples/nextjs-app-router` is migrated to use the new package — same 120/125 conformance score under `next dev`, ~50 lines instead of ~120 hand-rolled.

  The `@dualmark/*` linked changeset group means all packages get a coordinated patch bump.

- Updated dependencies [9f9f1d1]
  - @dualmark/core@0.5.0

## 0.3.1

### Patch Changes

- fbc7b17: ## v0.3.1 — Hotfix: workspace dep resolution + landing visual polish

  Patch release fixing one critical packaging bug introduced upstream by `bun publish` and one set of landing-page visual inconsistencies. **Strongly recommended upgrade for anyone on 0.3.0** — fresh installs of 0.3.0 resolve mismatched workspace versions.

  ### Critical: workspace dep versions in published tarballs

  `@dualmark/cli@0.3.0`, `@dualmark/astro@0.3.0`, `@dualmark/cloudflare@0.3.0`, and `@dualmark/converters@0.3.0` were published with a stale `@dualmark/core` dependency pin of `0.2.1` instead of `0.3.0`. Running `bun add @dualmark/cli@0.3.0` in a fresh project resolves `@dualmark/core@0.2.1` alongside it — a mixed-version install. APIs are byte-equivalent across 0.2.1 and 0.3.0 so it does not crash, but the dependency graph is incorrect.

  Root cause: `bun publish` reads workspace dependency versions from `bun.lock` metadata (cached at last install time), not from the current `packages/*/package.json` files. When `changeset version` bumps versions but does not regenerate the lockfile, `bun publish` rewrites `workspace:*` deps to the **previous** version. Tracked upstream as `oven-sh/bun#20477`.

  Fixed by:
  - Chaining `bun install --lockfile-only` after `changeset version` in the `version-packages` script, so the version PR commits a refreshed lockfile.
  - Adding the same step in `release.yml` before `bun publish` runs, as a self-healing safety net for tagged releases.

  `@dualmark/cli@0.3.1` and the other adapters now correctly declare `"@dualmark/core": "0.3.1"` in their published `package.json`.

  ### Landing-page visual fixes
  - Removed full-viewport `border-b` from the hero section that produced a stray horizontal hairline below the terminal demo.
  - Promoted page-rail z-index above the hero's `BeamsBackground` gradients so the rails are visible end-to-end.
  - Scoped the navbar's bottom border to its inner `max-w-7xl` column so it terminates at the rails (was full-viewport).
  - Added consistent inter-section dividers between the rails for vertical rhythm — now every section transition has a clean ┬ intersection at both rail crossings.

  No package source-code changes; landing fixes affect `apps/docs/` only.

  ### Migration
  - **From 0.3.0**: `bun update @dualmark/*` (or your equivalent). No code changes required.
  - **From 0.2.x**: see the v0.3.0 changelog for the relicense + identity changes; this 0.3.1 release rolls those forward with the dep fix.

- Updated dependencies [fbc7b17]
  - @dualmark/core@0.3.1

## 0.3.0

### Minor Changes

- f1a0eb0: ## v0.3.0 — Landing rewrite, Apache 2.0 relicense, /play layout consistency

  This is a meta-release. **No package source-code changes ship in this version**, but we're cutting a minor bump (rather than a patch) because the project's identity and license changed substantively in this window:
  - **Relicensed from MIT to Apache 2.0** with an Apache `NOTICE` file. Apache 2.0 includes a patent grant, which matters for infrastructure libraries that may touch standard-tracking work (content negotiation, AI bot UA detection, llms.txt). The permissive nature is unchanged. Existing 0.2.x installs are unaffected, but new installs and downstream redistributors should be aware of the license change.
  - **Landing page restructured** for problem-first positioning ("ChatGPT cites your competitor — that's an infrastructure problem"). Cut three weak sections (TrustStrip, Architecture diagram, standalone Converters page); folded Converters into Adapters as an inline chip strip; promoted the playground teaser to second-position so visitors can score their own site immediately; reframed the conformance section from "Verify CLI" to "Catch regressions in CI" with a real GitHub Actions workflow snippet; added a Dodo Payments case study with the 5× AI-agent-traffic lift; added Vercel-style vertical page rails framing the content column.
  - **Playground layout aligned with the new landing** — page rails, contained background, max-w-7xl content column.
  - **SEO/AEO metadata aligned** across `<head>`, JSON-LD organization schema, llms.txt, raw markdown twin, and Fumadocs frontmatter — every search snippet and AI crawler artifact now carries the same problem-first hook as the landing.
  - **Documentation pass**: README test-count claims corrected (now 266 across 5 packages, was incorrectly 253), `npx @dualmark/cli` unified to `bunx @dualmark/cli` across all docs, version drift in `CONTRIBUTING.md` and `packages/astro/README.md` corrected, customer proof point injected into the Next.js and Cloudflare integration pages.

  ### What changed in package source: nothing.

  All 5 packages are byte-equivalent to 0.2.1 in published shape. The minor bump is solely to communicate the license and brand-identity change clearly in the npm changelog and to give downstream auditors a clean version boundary. If you're already on 0.2.1 and don't care about the relicense announcement, you can skip this version with no functional impact.

  ### Migration
  - **Code**: none required.
  - **License notices**: if you redistribute @dualmark/\* or fork them, your `LICENSE` and `NOTICE` references should now point to Apache 2.0 (not MIT).
  - **CLI**: prefer `bunx @dualmark/cli verify <url>` over `npx @dualmark/cli verify <url>` for consistency with the rest of the project's tooling. Both still work.

### Patch Changes

- Updated dependencies [f1a0eb0]
  - @dualmark/core@0.3.0

## 0.2.1

### Patch Changes

- **Hotfix**: 0.2.0 published with unresolved `workspace:*` protocol in dependencies, breaking installation for downstream consumers. 0.2.1 publishes with proper version ranges. Switch from `changeset publish` (which delegates to `npm publish` and doesn't rewrite workspace protocol) to `bun publish` per-package, which correctly resolves `workspace:*` → actual version at pack time.

## 0.2.0

### Minor Changes

- 5e49dc2: Direct `.md` URLs (e.g. `/blog/post.md`) now receive the full set of AEO headers (`Content-Type`, `X-Markdown-Tokens`, `X-Robots-Tag`, `Vary: Accept`, `X-Content-Type-Options: nosniff`) when fetched from `ASSETS` binding. Previously only content-negotiated responses got the full header set, leaving direct `.md` requests at the edge under-decorated.

### Patch Changes

- Updated dependencies [5e49dc2]
  - @dualmark/core@0.2.0
