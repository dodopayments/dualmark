# @dualmark/nextjs

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
