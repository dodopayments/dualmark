# @dualmark/converters

Production-tested markdown converter factories for the Dualmark AEO framework.

## Install

```bash
bun add @dualmark/converters @dualmark/core
```

## Available converters

| Factory | Domain |
|---|---|
| `apiReferenceConverter` | API References (with `fromOpenAPI` helper) |
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
| `statusPageConverter` | Public status / uptime pages (components + incidents) |
| `toolConverter` | Standalone tools |
| `videoConverter` | Video pages |

## Usage

```ts
import { blogConverter } from "@dualmark/converters";

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
```

Each factory takes a config object and returns a `(entry) => string` converter. Pass them to `@dualmark/astro` collection config or call directly from your own framework.

### OpenAPI helper

Note that OpenAPI YAML must be parsed into a JavaScript object before calling `fromOpenAPI()`.

```ts
import { fromOpenAPI, apiReferenceConverter } from "@dualmark/converters";
import { parse } from "yaml";

const spec = parse(yamlString); // You must provide a parsed JS object
const entry = fromOpenAPI(spec, "getPetById");
const md = apiReferenceConverter({ siteUrl: "https://example.com" })(entry);
```

## License

Apache 2.0
