# @dualmark/vercel

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

## 0.9.0

### Minor Changes

- 0b14fc1: Add `@dualmark/vercel` — Vercel Edge Middleware adapter for the Dualmark AEO framework.
