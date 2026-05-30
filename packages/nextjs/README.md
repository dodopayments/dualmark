# @dualmark/nextjs

Next.js App Router adapter for the Dualmark AEO framework.

Same one-line install as `@dualmark/astro` — `withDualmark()` for the config,
`createDualmarkMiddleware()` for `proxy.ts` (or `middleware.ts` on Next ≤15),
`createDualmarkRouteHandler()` for the markdown twin route handler, and
`createLlmsTxtHandler()` for `/llms.txt`.

## Install

```bash
bun add @dualmark/nextjs @dualmark/core @dualmark/converters
```

## Usage

```ts title="next.config.mjs"
import { withDualmark } from "@dualmark/nextjs";

export default withDualmark(
  { reactStrictMode: true },
  {
    siteUrl: "https://example.com",
    collections: {
      blog: {
        converter: "blog",
        getEntries: () => yourPosts,
      },
    },
    llmsTxt: {
      enabled: true,
      brandName: "Acme",
      sections: [{ title: "Pages", links: [{ title: "Home", href: "/" }] }],
    },
  },
);
```

```ts title="proxy.ts"
import { createDualmarkMiddleware } from "@dualmark/nextjs";

const middleware = createDualmarkMiddleware({
  siteUrl: "https://example.com",
});

export default middleware;
export const config = middleware.config;
```

_On Next.js ≤15, name the file `middleware.ts` instead. The body is identical._

```ts title="app/md/[...path]/route.ts"
import { createDualmarkRouteHandler } from "@dualmark/nextjs";
import { POSTS } from "@/lib/posts";

const handler = createDualmarkRouteHandler({
  siteUrl: "https://example.com",
  collections: {
    blog: {
      converter: "blog",
      getEntries: () => POSTS,
    },
  },
  staticPages: [{ pattern: "/", render: () => "# Home\n\nWelcome." }],
});

export const GET = handler.GET;
export const generateStaticParams = handler.generateStaticParams;
export const dynamic = "force-static";
```

```ts title="app/llms.txt/route.ts"
import { createLlmsTxtHandler } from "@dualmark/nextjs";

const handler = createLlmsTxtHandler({
  brandName: "Acme",
  sections: [{ title: "Pages", links: [{ title: "Home", href: "/" }] }],
});

export const GET = handler.GET;
export const dynamic = "force-static";
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ proxy.ts                                                    │
│   - if path ends in .md     → rewrite to /md/<path>        │
│   - if AI bot UA OR Accept: text/markdown                   │
│       → rewrite to /md/<path>                               │
│   - if Accept rules out html+md → 406                       │
│   - else (HTML) → next() + Link rel=alternate header        │
└─────────────────────────────────────────────────────────────┘

app/
├── ...your existing pages
├── md/[...path]/route.ts   ← createDualmarkRouteHandler (renders .md)
└── llms.txt/route.ts       ← createLlmsTxtHandler (renders /llms.txt)
```

`/md/...` is an internal namespace your users never see — the proxy rewrites
to it, and the route handler dispatches to your collections, static pages, or
parameterized routes. Configurable via `internalNamespace` if you need a
different name.

## Built-in converter names

`blog`, `case-study`, `changelog`, `compare`, `docs`, `feature`, `glossary`,
`legal`, `pricing`, `pseo`, `status-page`, `tool`, `video`. Pass any of them as `converter`,
or pass a function `(entry) => string` for custom output.

## Why Next.js needs `getEntries`

Astro has `astro:content` to discover collection entries automatically.
Next.js has no equivalent — content can come from the filesystem, a CMS, a
database, anything. So you supply `getEntries: () => Entry[] | Promise<Entry[]>`
and the adapter does the rest.

## License

Apache 2.0
