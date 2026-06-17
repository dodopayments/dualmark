# @dualmark/nuxt

Nuxt module for the Dualmark AEO framework.

## Install

```bash
bun add @dualmark/nuxt @dualmark/core @dualmark/converters
```

## Usage

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@dualmark/nuxt'
  ],

  dualmark: {
    siteUrl: "https://example.com",

    collections: {
      blog: {
        converter: "blog",
        route: "blog",
        filter: (entry) => entry.data.published !== false,
        sort: (a, b) => b.data.publishedDate - a.data.publishedDate,
      },
      glossary: {
        converter: "glossary",
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
  }
});
```

## What it does

- Generates `.md` endpoints for every configured collection (`/blog/[...slug].md`, `/blog.md`)
- Generates `.md` endpoints for every configured static page (`/index.md`, `/about.md`)
- Generates `.md` endpoints for every parameterized route (`/blog/category/[category].md`)
- Generates `/llms.txt` from config
- Injects a Nuxt server plugin that adds `Link rel="alternate" type="text/markdown"` to every HTML response
- Validates config (throws `DualmarkConfigError` with helpful messages on misconfiguration)

## Built-in converter names

`blog`, `case-study`, `changelog`, `compare`, `docs`, `feature`, `glossary`, `legal`, `pricing`, `pseo`, `tool`, `video`

Pass any string from this list as `converter`. Inline converter functions are currently not supported in Nuxt as they cannot be serialized into generated templates (planned for a future release).

## Where the generated files live

`.nuxt/dualmark/` — regenerated on every Nuxt build. You don't need to commit anything.

## License

Apache 2.0
