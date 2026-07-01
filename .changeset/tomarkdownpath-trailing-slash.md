---
"@dualmark/core": patch
---

Fix `toMarkdownPath` doubling the extension on a `.md` path with a trailing slash.

The `.md` idempotency check ran before trailing slashes were stripped, so `toMarkdownPath("/blog/post.md/")` returned `/blog/post.md.md` (and `toMarkdownUrl` produced the same doubled path), which would 404. Trailing slashes are now stripped first, so a markdown path with a trailing slash maps back to itself. All other cases (root to `/index.md`, trailing-slash stripping, deep nesting) are unchanged.
