# dualmark-example-sanity-astro

CMS-driven Astro example demonstrating Sanity content as the source for both human HTML pages and Dualmark markdown twins.

This example is fixture-backed by default so it runs in open-source CI without Sanity credentials. You can opt into a live public Sanity dataset locally with environment variables.

## Run with fixtures

```bash
bun install
bun run --filter @dualmark/astro --filter @dualmark/core --filter @dualmark/converters build
bun run --filter dualmark-example-sanity-astro build
bun run --filter dualmark-example-sanity-astro dev
```

Visit:

- `http://127.0.0.1:4322/blog/cms-driven-aeo`
- `http://127.0.0.1:4322/blog/cms-driven-aeo.md`
- `http://127.0.0.1:4322/glossary/answer-engine-optimization`
- `http://127.0.0.1:4322/glossary/answer-engine-optimization.md`
- `http://127.0.0.1:4322/llms.txt`

## Verify with the CLI

In one terminal:

```bash
bun run --filter dualmark-example-sanity-astro dev
```

In another terminal:

```bash
bun run --filter dualmark-example-sanity-astro verify:blog
bun run --filter dualmark-example-sanity-astro verify:glossary
```

Expected output: at least **80/80 with `--skip-negotiation`** for both documents under Astro dev. The scripts use `127.0.0.1` instead of `localhost` so Node's fetch path works reliably on Windows and Linux. Full content negotiation requires an edge/runtime adapter; this example follows the same static-mode caveat as `examples/astro-blog`.

If `bun run dev` says port `4322` is already in use, stop the old dev server first:

```powershell
Get-Process bun -ErrorAction SilentlyContinue | Stop-Process -Force
```

The dev script intentionally fails when `4322` is busy. Astro normally falls forward to another port, such as `4323`, but the verifier scripts are pinned to `4322` so the example must not silently switch ports.

## Why this matters for marketers

Marketing teams already publish through a CMS. They should not need a second authoring workflow just to be readable by answer engines.

This example shows the practical path:

1. Editors keep writing in Sanity.
2. Astro renders polished HTML for humans.
3. Dualmark emits clean markdown twins and `llms.txt` for AI agents.
4. CI verifies the markdown output before content infrastructure changes ship.

The result is one editorial source of truth with two optimized representations: HTML for people and markdown for AI crawlers.

## Fixture mode vs live Sanity mode

Fixture mode is the default. The fixture export lives at `src/fixtures/sanity-export.json` and contains two blog posts plus two glossary terms. CI uses this file so builds are deterministic and never depend on a live CMS, network availability, API limits, or secrets.

To test your own Sanity project locally, copy `.env.example` to `.env` and set:

```dotenv
SANITY_FIXTURE_MODE=false
PUBLIC_SANITY_PROJECT_ID=your_project_id
PUBLIC_SANITY_DATASET=production
PUBLIC_SANITY_API_VERSION=2026-06-10
```

Use a public read dataset. Do not add `SANITY_API_TOKEN` to this example; token-based draft or preview support is intentionally out of scope for issue #19.

## Sanity setup

Create a `post` document type with fields shaped like this:

```ts
defineType({
  name: "post",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string" }),
    defineField({ name: "slug", type: "slug", options: { source: "title" } }),
    defineField({ name: "description", type: "text" }),
    defineField({ name: "author", type: "string" }),
    defineField({ name: "publishedAt", type: "datetime" }),
    defineField({ name: "modifiedAt", type: "datetime" }),
    defineField({ name: "category", type: "array", of: [{ type: "string" }] }),
    defineField({
      name: "body",
      type: "array",
      of: [
        {
          type: "block",
          marks: {
            annotations: [
              defineField({
                name: "internalLink",
                type: "object",
                fields: [
                  defineField({
                    name: "reference",
                    type: "reference",
                    to: [{ type: "post" }, { type: "glossaryTerm" }],
                  }),
                ],
              }),
            ],
          },
        },
        { type: "image" },
      ],
    }),
  ],
});
```

Create a `glossaryTerm` document type with fields shaped like this:

```ts
defineType({
  name: "glossaryTerm",
  type: "document",
  fields: [
    defineField({ name: "term", type: "string" }),
    defineField({ name: "title", type: "string" }),
    defineField({ name: "slug", type: "slug", options: { source: "term" } }),
    defineField({ name: "definition", type: "text" }),
    defineField({ name: "category", type: "string" }),
    defineField({ name: "relatedTerms", type: "array", of: [{ type: "string" }] }),
    defineField({ name: "canonicalBlog", type: "url" }),
    defineField({
      name: "body",
      type: "array",
      of: [
        {
          type: "block",
          marks: {
            annotations: [
              defineField({
                name: "internalLink",
                type: "object",
                fields: [
                  defineField({
                    name: "reference",
                    type: "reference",
                    to: [{ type: "post" }, { type: "glossaryTerm" }],
                  }),
                ],
              }),
            ],
          },
        },
        { type: "image" },
      ],
    }),
  ],
});
```

The live GROQ queries dereference `body[].markDefs[]` for `internalLink` annotations and project them into the fixture shape used by `portableTextToMarkdownBody`: `{ type: "blog" | "glossary", slug: "..." }`. If you customize the annotation name or reference targets, update `src/lib/sanity/queries.ts` and `src/lib/sanity/to-markdown.ts` together.

The loader maps Sanity fields to the built-in Dualmark converter fields:

- `post.publishedAt` -> `blog.data.publishedDate`
- `glossaryTerm.definition` -> `glossary.data.summary`
- Portable Text `body` -> `entry.body` for Dualmark and `rendered` HTML for Astro

## What is wired up

- `blog` and `glossary` Astro content collections backed by Sanity-shaped fixtures or a live public Sanity dataset.
- `/blog/[slug]` and `/glossary/[slug]` HTML pages for humans.
- `/blog/[slug].md` and `/glossary/[slug].md` markdown twins from `@dualmark/astro`.
- `/blog.md` and `/glossary.md` listing twins.
- `/index.md`, `/about.md`, and `/llms.txt` generated from Dualmark config.
- Unit tests for the risky Sanity-to-Dualmark mapping and Portable Text markdown conversion.

## CI behavior

The conformance workflow builds and verifies this example in fixture mode. That is intentional: live CMS calls in CI would make PR checks nondeterministic and would not work reliably for forked pull requests.

If you change the Sanity schema, update `src/fixtures/sanity-export.json` in the same PR so fixture mode and live mode stay aligned.

## License

Apache 2.0
