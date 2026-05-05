# @dualmark/cloudflare

## 0.2.0

### Minor Changes

- 5e49dc2: Direct `.md` URLs (e.g. `/blog/post.md`) now receive the full set of AEO headers (`Content-Type`, `X-Markdown-Tokens`, `X-Robots-Tag`, `Vary: Accept`, `X-Content-Type-Options: nosniff`) when fetched from `ASSETS` binding. Previously only content-negotiated responses got the full header set, leaving direct `.md` requests at the edge under-decorated.

### Patch Changes

- Updated dependencies [5e49dc2]
  - @dualmark/core@0.2.0
