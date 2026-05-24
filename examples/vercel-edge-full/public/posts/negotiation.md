# Edge content negotiation

> How the Vercel edge adapter handles Accept negotiation.

- **Author**: Sisyphus
- **Date**: 2026-05-24
- **Category**: explainers

When a request arrives at the Vercel Edge Middleware:

- Known AI bot UA → respond with markdown
- `Accept: text/markdown` → respond with markdown
- Otherwise → respond with HTML, plus a `Link: <…>; rel="alternate"` header

This way the **same URL** serves the right content to the right consumer — no duplicate URLs, no cloaking.
