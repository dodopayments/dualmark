---
"@dualmark/nextjs": patch
---

Update package metadata and docs for Next.js 16 compatibility.

- Drop the "Next.js 15" reference from the package description; the adapter
  works with the Next.js App Router on 14, 15, and 16.
- Bump the `next` devDependency from `^15.0.0` to `^16.2.6` (test/build
  toolchain only — the `peerDependencies` range is unchanged).
- Update README to document the Next.js 16 `proxy.ts` file convention,
  with a note that Next ≤15 should keep using `middleware.ts` (body is
  identical). No runtime behavior change.

The reference example at `examples/nextjs-app-router` was migrated to
Next.js 16 in the same change and still scores 120/125 under `next dev`.
