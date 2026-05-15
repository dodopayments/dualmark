---
title: AEO at the Edge with Netlify
description: How Netlify Edge Functions + Dualmark deliver markdown to AI bots at the edge.
author: Sisyphus
publishedDate: 2026-05-14
category: architecture
---

Netlify Edge Functions run on Deno at the network edge. When an AI bot hits this site, it gets markdown from the nearest edge location — with minimal latency.

## The handler pattern

`createAEOHandler` returns a standard Netlify Edge Function handler. It intercepts incoming requests and adds:

1. AI bot detection via User-Agent
2. Trailing slash normalization
3. Markdown serving from prebuilt static `.md` files
4. Internal/external redirects with markdown notices
5. `Link rel="alternate"` header injection on HTML responses
6. Lifecycle hooks for custom analytics

The adapter calls `context.next()` for all non-bot traffic — the wrapping is **transparent**.
