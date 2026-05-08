---
"@dualmark/nextjs": patch
---

Fix `withDualmark()` rejecting typed `NextConfig` from `next.config.ts`.

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
