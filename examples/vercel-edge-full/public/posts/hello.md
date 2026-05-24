# Hello from Vercel Edge + Dualmark

> First post demonstrating @dualmark/vercel edge middleware.

- **Author**: Sisyphus
- **Date**: 2026-05-24
- **Category**: announcements

This is the **first post** demonstrating the `@dualmark/vercel` edge adapter.

Every page on this site has a markdown twin. Append `.md` to any URL or send `Accept: text/markdown`.

## How it works

The Vercel Edge Middleware intercepts every request, checks the User-Agent and Accept headers, and serves markdown to AI bots — all at the edge, with zero cold-start overhead.
