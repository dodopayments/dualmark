# @dualmark/sveltekit

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

## 0.9.0

### Minor Changes

- 08bf7c8: Add the SvelteKit adapter with generated markdown endpoints, llms.txt support, and a handle hook for Dualmark negotiation.
