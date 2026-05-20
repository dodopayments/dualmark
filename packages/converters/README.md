# @dualmark/converters

Production-tested markdown converter factories for the Dualmark AEO framework.

## Install

```bash
bun add @dualmark/converters @dualmark/core
```

## Available converters

| Factory | Domain |
|---|---|
| `apiReferenceConverter` | API endpoint references (manual shape or OpenAPI-derived) |
| `blogConverter` | Blog posts |
| `caseStudyConverter` | Case studies (with stats + customer quote) |
| `changelogConverter` | Release notes (Keep-a-Changelog grouping) |
| `compareConverter` | Comparison pages (us vs. competitor table) |
| `docsConverter` | Documentation pages |
| `featureConverter` | Feature/product pages with siblings, FAQ, problem/solution |
| `glossaryConverter` | Glossary terms (with learn-more + canonical-blog) |
| `integrationConverter` | Marketplace / app integration listings (vendor, categories, capabilities) |
| `legalConverter` | Legal pages |
| `pricingConverter` | Pricing tables with tier highlights and CTAs |
| `pseoConverter` | Programmatic SEO pages with facts + related-link groups |
| `toolConverter` | Standalone tools |
| `videoConverter` | Video pages |

That includes 14 built-in converters in total.

## Usage

```ts
import { apiReferenceConverter, blogConverter, fromOpenAPI } from "@dualmark/converters";

const convert = blogConverter({
  siteUrl: "https://example.com",
  basePath: "/blog",
  brandFooter: "## About Acme\n\nWe build widgets.",
});

const md = convert({
  id: "first-post",
  data: { title: "Hello", publishedDate: new Date(), author: "Alice" },
  body: "Long-form content.",
});

const endpoint = fromOpenAPI(parsedOpenApiDoc, "addPet");
const endpointMd = apiReferenceConverter({
  siteUrl: "https://example.com",
  basePath: "/api-reference",
})(endpoint);
```

Each factory takes a config object and returns a `(entry) => string` converter. Pass them to `@dualmark/astro` collection config or call directly from your own framework.

## License

Apache 2.0
