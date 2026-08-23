# @dualmark/nextjs

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

## 0.8.0

### Patch Changes

- Updated dependencies [8e8f315]
  - @dualmark/converters@0.8.0

## 0.7.0

### Patch Changes

- Updated dependencies [dbd8ef4]
- Updated dependencies [6155878]
  - @dualmark/converters@0.7.0
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
  - @dualmark/converters@0.5.2

## 0.5.1

### Patch Changes

- e458ec5: Fix `withDualmark()` rejecting typed `NextConfig` from `next.config.ts`.

  The internal `NextConfigShape` constraint had an `[key: string]: unknown` index
  signature, which TypeScript treats as a structural demand on the input. Next.js's
  `NextConfig` is a closed interface with no top-level index signature, so any
  caller passing a typed `next.config.ts` hit:

  ```
  Type 'NextConfig' is not assignable to type 'NextConfigShape'.
    Index signature for type 'string' is missing in type 'NextConfig'.
  ```

  The constraint was unnecessary — the function only reads `transpilePackages`
  and spreads the remaining config, neither of which need an index signature.
  Removing it unblocks typed configs on Next 14, 15, and 16. Runtime behavior
  is unchanged.

- e9307b3: Update package metadata and docs for Next.js 16 compatibility.
  - Drop the "Next.js 15" reference from the package description; the adapter
    works with the Next.js App Router on 14, 15, and 16.
  - Bump the `next` devDependency from `^15.0.0` to `^16.2.6` (test/build
    toolchain only — the `peerDependencies` range is unchanged).
  - Update README to document the Next.js 16 `proxy.ts` file convention,
    with a note that Next ≤15 should keep using `middleware.ts` (body is
    identical). No runtime behavior change.

  The reference example at `examples/nextjs-app-router` was migrated to
  Next.js 16 in the same change and still scores 120/125 under `next dev`.

## 0.5.0

### Minor Changes

- 9f9f1d1: ## New: `@dualmark/nextjs` — first-class Next.js 15 App Router adapter

  Closes #4. Same one-line install as `@dualmark/astro`:
  - `withDualmark(nextConfig, options)` — wraps `next.config.mjs`
  - `createDualmarkMiddleware(options)` — drop-in `middleware.ts`
  - `createDualmarkRouteHandler(options)` — catch-all markdown twin route handler with `generateStaticParams`
  - `createLlmsTxtHandler(options)` — `/llms.txt` route handler

  Mirrors `@dualmark/astro`'s `collections` / `staticPages` / `parameterizedRoutes` config shape so users can copy their config across frameworks. Built-in converter names work identically. Tree-shakeable, zero runtime deps beyond `@dualmark/core` and `@dualmark/converters`.

  `examples/nextjs-app-router` is migrated to use the new package — same 120/125 conformance score under `next dev`, ~50 lines instead of ~120 hand-rolled.

  The `@dualmark/*` linked changeset group means all packages get a coordinated patch bump.

### Patch Changes

- Updated dependencies [9f9f1d1]
  - @dualmark/core@0.5.0
  - @dualmark/converters@0.5.0
