# @dualmark/nextjs

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
