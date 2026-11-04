---
"@dualmark/nextjs": patch
---

Skip static files (`.xml`, `.txt`, `.json`, `.js`, `.css`, images, fonts, `.pdf`) in the Next.js middleware.

The middleware only skipped `/llms.txt`, so a markdown request for `/sitemap.xml` or `/robots.txt` was rewritten to a markdown twin that does not exist, and HTML-accepting requests got a `Link: </sitemap.xml.md>` header. It now skips the same file extensions as the cloudflare, deno, fastly, netlify and vercel adapters.
