---
"@dualmark/astro": patch
---

Include the config file path in Dualmark config validation error messages (e.g. `[astro.config.mjs] Dualmark config error: siteUrl is required`), making it clear which file to fix when the integration is misconfigured.
