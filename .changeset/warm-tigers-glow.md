---
"@dualmark/core": minor
"@dualmark/astro": minor
"@dualmark/cloudflare": minor
"@dualmark/deno": minor
"@dualmark/nextjs": minor
"@dualmark/sveltekit": minor
"@dualmark/vercel": minor
---

Add pluggable token estimator with inline `tokenizer` option

- `estimateTokens(text, { tokenizer })` accepts an inline override function
- Export `TokenEstimator` type, `setTokenEstimator`, and `resetTokenEstimator` from core
- Add `tokenizer` option to all adapter configs: Astro, Cloudflare, Deno, Next.js, SvelteKit
- Astro adapter supports both function tokenizers and module-path strings (e.g. `"./src/aeo-tokenizer.ts"`) for tokenizers that close over external state like js-tiktoken
