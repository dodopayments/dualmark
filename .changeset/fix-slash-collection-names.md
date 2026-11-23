---
"@dualmark/astro": patch
---

Fix `astro build` crashing with ENOENT when a content collection name contains a slash (e.g. locale-prefixed routes like "zh/blog"): generated route filenames are now sanitized, matching what staticPages and parameterizedRoutes already did.
