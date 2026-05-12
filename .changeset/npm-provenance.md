---
"@dualmark/core": patch
"@dualmark/converters": patch
"@dualmark/astro": patch
"@dualmark/nextjs": patch
"@dualmark/cloudflare": patch
"@dualmark/cli": patch
---

Release pipeline now publishes with **npm provenance attestation**. Every
`@dualmark/*` tarball on npmjs.com is now Sigstore-signed and traceable back
to the exact GitHub Actions workflow run + commit SHA that built it. Visible
as a "Provenance" badge on each package's npm page.

No behavior change inside the packages themselves — this is a supply-chain
hardening release. Consumers can verify with `npm audit signatures`.
