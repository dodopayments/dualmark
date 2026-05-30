# @dualmark/sveltekit

SvelteKit adapter for the Dualmark AEO framework.

## Install

```bash
bun add @dualmark/sveltekit @dualmark/core @dualmark/converters
```

## Quickstart

Create a Dualmark config that SvelteKit routes can import:

```ts
// src/dualmark.config.ts
import type { DualmarkSvelteKitConfig } from "@dualmark/sveltekit";

const config: DualmarkSvelteKitConfig = {
  siteUrl: "https://example.com",
  collections: {
    posts: {
      converter: "blog",
      route: "posts",
      getEntries: () => yourPosts,
    },
  },
  staticPages: [{ pattern: "/", render: () => "# Home\n\nWelcome." }],
  llmsTxt: {
    enabled: true,
    brandName: "Acme",
    sections: [{ title: "Pages", links: [{ title: "Home", href: "/" }] }],
  },
};

export default config;
```

Add the generator before SvelteKit in `vite.config.ts`:

```ts
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import dualmark from "@dualmark/sveltekit";
import dualmarkConfig from "./src/dualmark.config";

export default defineConfig({
  plugins: [dualmark(dualmarkConfig), sveltekit()],
});
```

Add the server hook:

```ts
// src/hooks.server.ts
import { createDualmarkHandle } from "@dualmark/sveltekit";
import dualmarkConfig from "./dualmark.config";

export const handle = createDualmarkHandle(dualmarkConfig);
```

If you already have server hooks, compose them with SvelteKit's `sequence` helper:

```ts
// src/hooks.server.ts
import { sequence } from "@sveltejs/kit/hooks";
import { createDualmarkHandle } from "@dualmark/sveltekit";
import dualmarkConfig from "./dualmark.config";
import { handle as authHandle } from "./auth.server";

export const handle = sequence(authHandle, createDualmarkHandle(dualmarkConfig));
```

## Collection URLs and slugs

With `slugStrategy: "catch-all"` (the default when omitted), the detail route uses `[...slug]`. **Each entry’s `id` must match the full path after the collection prefix**, including any `/` characters (for example, use `id: "2024/01/post"` if the markdown URL is `/posts/2024/01/post.md`). With `slugStrategy: "single"`, `id` is one segment (for example `hello` → `/posts/hello.md`).

## What It Does

- Generates public `.md` endpoints from configured collections, static pages, and parameterized routes.
- Generates `/llms.txt` when enabled.
- Adds a SvelteKit `handle` hook that serves markdown to AI bots and `Accept: text/markdown` requests.
- Adds `Link rel="alternate"; type="text/markdown"` and `Vary: Accept` to HTML responses.
- Returns `406` when an `Accept` header rules out both HTML and markdown.

Generated route files are written into `src/routes` during Vite’s `buildStart` (dev and production builds), not during config resolution, so tools that only load the Vite config do not mutate the tree. They start with a fixed generated header. **Do not copy that header into hand-written routes** — Dualmark treats those files as generated and may delete them when your config changes.

Existing user-authored route files without that header are never overwritten, and stale generated route files are cleaned up when your config changes.

## Built-in Converter Names

`blog`, `case-study`, `changelog`, `compare`, `docs`, `feature`, `glossary`, `integration`, `legal`, `pricing`, `pseo`, `status-page`, `tool`, `video`

Pass any string from this list as `converter`, or pass a function `(entry) => string` for custom output.

## License

Apache 2.0
