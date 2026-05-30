# @dualmark/astro

Astro integration for the Dualmark AEO framework.

## Install

```bash
bun add @dualmark/astro @dualmark/core @dualmark/converters
```

## Usage

```ts
// astro.config.mjs
import { defineConfig } from "astro/config";
import dualmark from "@dualmark/astro";

export default defineConfig({
  site: "https://example.com",
  integrations: [
    dualmark({
      siteUrl: "https://example.com",

      collections: {
        blog: {
          converter: "blog",
          route: "blog",
          slugStrategy: "catch-all",
        },
        glossary: {
          converter: "glossary",
          slugStrategy: "single",
        },
      },

      staticPages: [
        { pattern: "/", render: () => "# Home\n\nWelcome to Acme." },
        { pattern: "/about", render: () => "# About\n\nAcme builds widgets." },
      ],

      parameterizedRoutes: [
        {
          pattern: "/blog/category/[category]",
          getStaticPaths: async () => [{ params: { category: "engineering" } }],
          render: ({ params }) => `# ${params.category} posts`,
        },
      ],

      llmsTxt: {
        enabled: true,
        brandName: "Acme",
        description: "Widgets for everyone.",
        sections: [
          {
            title: "Products",
            links: [{ title: "Widget", href: "https://example.com/widget" }],
          },
        ],
      },

      middleware: { injectLinkHeader: true },
    }),
  ],
});
```

## What it does

- Generates `.md` endpoints for every configured collection (`/blog/[...slug].md`, `/blog.md`)
- Generates `.md` endpoints for every configured static page (`/index.md`, `/about.md`)
- Generates `.md` endpoints for every parameterized route (`/blog/category/[category].md`)
- Generates `/llms.txt` from config
- Injects an Astro middleware that adds `Link rel="alternate" type="text/markdown"` to every HTML response
- Validates config (throws `DualmarkConfigError` with helpful messages on misconfiguration)

## Built-in converter names

`blog`, `case-study`, `changelog`, `compare`, `docs`, `feature`, `glossary`, `legal`, `pricing`, `pseo`, `status-page`, `tool`, `video`

Pass any string from this list as `converter`, or pass a function (currently not serializable into generated routes — planned for a future release).

## Where the generated files live

`node_modules/.dualmark-generated/` — regenerated on every Astro build. You don't need to commit anything.

## License

Apache 2.0
