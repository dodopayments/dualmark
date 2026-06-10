import { describe, it, expect } from "vitest";
import {
  apiReferenceConverter,
  fromOpenAPI,
} from "../src/api-reference.js";
import { PETSTORE_SPEC } from "./fixtures/petstore-openapi.js";
import {
  blogConverter,
  caseStudyConverter,
  changelogConverter,
  compareConverter,
  docsConverter,
  featureConverter,
  glossaryConverter,
  integrationConverter,
  type IntegrationEntryData,
  legalConverter,
  pricingConverter,
  pseoConverter,
  toolConverter,
  videoConverter,
  BUILT_IN_CONVERTERS,
} from "../src/index.js";

const SITE = "https://acme.test";

describe("blogConverter", () => {
  const convert = blogConverter({ siteUrl: SITE });

  it("renders title, description, dates, and URL", () => {
    const out = convert({
      id: "first-post",
      data: {
        title: "First Post",
        description: "An intro.",
        author: "Alice",
        publishedDate: new Date("2026-05-01T00:00:00Z"),
        category: "engineering",
      },
      body: "Hello world.",
    });
    expect(out).toContain("# First Post");
    expect(out).toContain("> An intro.");
    expect(out).toContain("- **Author**: Alice");
    expect(out).toContain("- **Published**: 2026-05-01");
    expect(out).toContain("- **URL**: https://acme.test/blog/first-post");
    expect(out).toContain("Hello world.");
    expect(out).toContain("[More engineering articles](https://acme.test/blog/category/engineering)");
    expect(out).toContain("[All articles](https://acme.test/blog)");
  });

  it("supports array categories", () => {
    const out = convert({
      id: "p",
      data: {
        title: "T",
        publishedDate: new Date("2026-01-01T00:00:00Z"),
        category: ["A", "B"],
      },
    });
    expect(out).toContain("- **Category**: A, B");
  });

  it("respects custom basePath", () => {
    const c = blogConverter({ siteUrl: SITE, basePath: "/articles" });
    const out = c({
      id: "x",
      data: { title: "T", publishedDate: new Date("2026-01-01T00:00:00Z") },
    });
    expect(out).toContain("/articles/x");
  });

  it("includes brandFooter when supplied", () => {
    const c = blogConverter({ siteUrl: SITE, brandFooter: "## About Acme\n\nWidgets." });
    const out = c({
      id: "x",
      data: { title: "T", publishedDate: new Date("2026-01-01T00:00:00Z") },
    });
    expect(out).toContain("## About Acme");
  });
});

describe("caseStudyConverter", () => {
  const convert = caseStudyConverter({ siteUrl: SITE });

  it("renders company, industry, stats, and quote", () => {
    const out = convert({
      id: "widgetco",
      data: {
        title: "WidgetCo Scales 10x",
        description: "How.",
        company: "WidgetCo",
        industry: "SaaS",
        publishedDate: new Date("2026-04-01T00:00:00Z"),
        stats: [
          { value: "10x", label: "Growth" },
          { value: "$1M", label: "Revenue" },
        ],
        quote: { text: "Acme changed everything.", attribution: "Jane Doe, CTO" },
      },
      body: "The story.",
    });
    expect(out).toContain("# WidgetCo Scales 10x");
    expect(out).toContain("- **Company**: WidgetCo");
    expect(out).toContain("- **Industry**: SaaS");
    expect(out).toContain("- **Published**: 2026-04-01");
    expect(out).toContain("- **10x** -- Growth");
    expect(out).toContain("- **$1M** -- Revenue");
    expect(out).toContain("> Acme changed everything.");
    expect(out).toContain("> -- Jane Doe, CTO");
    expect(out).toContain("The story.");
  });

  it("omits quote section when quote not provided", () => {
    const out = convert({
      id: "x",
      data: { title: "T", company: "C", publishedDate: new Date("2026-01-01T00:00:00Z") },
    });
    expect(out).not.toContain("## Quote");
  });
});

describe("glossaryConverter", () => {
  const convert = glossaryConverter({ siteUrl: SITE });

  it("renders title, summary, body, learn more", () => {
    const out = convert({
      id: "api",
      data: {
        title: "API",
        summary: "Application Programming Interface.",
        learnMore: [{ title: "REST", href: "/glossary/rest" }],
        canonicalBlog: "/blogs/what-is-an-api",
      },
      body: "An API exposes...",
    });
    expect(out).toContain("# API");
    expect(out).toContain("> Application Programming Interface.");
    expect(out).toContain("/glossary/api");
    expect(out).toContain("## Learn More");
    expect(out).toContain("[REST](https://acme.test/glossary/rest)");
    expect(out).toContain("[Read the full guide](https://acme.test/blogs/what-is-an-api)");
  });

  it("preserves absolute URLs in learnMore", () => {
    const out = convert({
      id: "x",
      data: {
        title: "X",
        learnMore: [{ title: "External", href: "https://example.com/x" }],
      },
    });
    expect(out).toContain("[External](https://example.com/x)");
  });
});

describe("integrationConverter", () => {
  const convert = integrationConverter({ siteUrl: SITE, basePath: "/integrations" });

  it("renders capabilities prominently with setup, pricing, and requirements", () => {
    const out = convert({
      id: "stripe",
      data: {
        title: "Connect Stripe to Acme",
        vendor: "Stripe",
        categories: ["Payments", "Finance"],
        description: "Accept cards and subscriptions inside Acme.",
        capabilities: [
          "PCI-aware checkout hosted by Stripe",
          "Webhooks for payment lifecycle events",
          "Customer portal for self-serve billing",
        ],
        setupSteps: ["Create a Stripe account", "Paste API keys in Acme", "Enable the integration"],
        pricing: "Stripe processing fees apply; Acme does not add a platform fee for this connector.",
        requirements: ["Acme Business plan", "Verified business profile"],
      },
      body: "See the [Stripe docs](https://stripe.com/docs) for API details.",
    });
    expect(out).toContain("# Connect Stripe to Acme");
    expect(out).toContain("- **Vendor**: Stripe");
    expect(out).toContain("- **Categories**: Payments, Finance");
    expect(out).toContain("> Accept cards and subscriptions inside Acme.");
    expect(out).toContain("## Capabilities");
    expect(out).toContain("- PCI-aware checkout hosted by Stripe");
    expect(out).toContain("- Webhooks for payment lifecycle events");
    expect(out).toContain("## Setup");
    expect(out).toContain("1. Create a Stripe account");
    expect(out).toContain("## Pricing");
    expect(out).toContain("Stripe processing fees apply");
    expect(out).toContain("## Requirements");
    expect(out).toContain("- Acme Business plan");
    expect(out).toContain("- **URL**: https://acme.test/integrations/stripe");
    expect(out).toContain("See the [Stripe docs](https://stripe.com/docs) for API details.");
  });

  it("works with minimal data", () => {
    const c = integrationConverter({ siteUrl: SITE, basePath: "/i" });
    const out = c({
      id: "slack",
      data: {
        title: "Slack",
        vendor: "Slack Technologies",
        categories: [],
        description: "",
        capabilities: ["Post messages to a channel"],
      },
    });
    expect(out).toContain("# Slack");
    expect(out).toContain("## Capabilities");
    expect(out).toContain("- Post messages to a channel");
    expect(out).toContain("/i/slack");
  });

  it("includes brandFooter when supplied", () => {
    const c = integrationConverter({
      siteUrl: SITE,
      basePath: "/integrations",
      brandFooter: "## About Acme\n\nMarketplace connectors.",
    });
    const out = c({
      id: "hubspot",
      data: {
        title: "HubSpot",
        vendor: "HubSpot",
        categories: ["CRM"],
        description: "Sync contacts.",
        capabilities: ["Bi-directional sync"],
      },
    });
    expect(out).toContain("## About Acme");
    expect(out).toContain("Marketplace connectors.");
  });

  it("uses vendor or entry id when title is blank or missing at runtime", () => {
    const c = integrationConverter({ siteUrl: SITE, basePath: "/integrations" });
    expect(
      c({
        id: "stripe",
        data: {
          title: "   ",
          vendor: "Stripe",
          categories: [],
          description: "",
          capabilities: ["x"],
        },
      }),
    ).toContain("# Stripe");

    expect(
      c({
        id: "orphan",
        data: {
          title: "",
          vendor: "",
          categories: [],
          description: "",
          capabilities: [],
        } as IntegrationEntryData,
      }),
    ).toContain("# orphan");

    expect(
      c({
        id: "slack",
        data: {
          title: undefined as unknown as string,
          vendor: "Slack",
          categories: [],
          description: "",
          capabilities: [],
        },
      }),
    ).toContain("# Slack");
  });
});

describe("legalConverter", () => {
  const convert = legalConverter({ siteUrl: SITE });

  it("renders title, lastUpdated, and URL", () => {
    const out = convert({
      id: "tos",
      data: { title: "Terms", lastUpdated: new Date("2026-01-01T00:00:00Z") },
      body: "Use at your own risk.",
    });
    expect(out).toContain("# Terms");
    expect(out).toContain("- **Last Updated**: 2026-01-01");
    expect(out).toContain("- **URL**: https://acme.test/legal/tos");
  });
});

describe("compareConverter", () => {
  const convert = compareConverter({ siteUrl: SITE, ourBrandColumn: "Acme" });

  it("renders feature cards and comparison table", () => {
    const out = convert({
      id: "vs-foo",
      data: {
        title: "Acme vs Foo",
        description: "Why Acme.",
        competitorName: "Foo",
        featureCards: [{ title: "Speed", description: "Faster." }],
        comparison: [
          { feature: "Latency", ours: "10ms", competitor: "100ms" },
          { feature: "Price", ours: "$10", competitor: "$50" },
        ],
      },
    });
    expect(out).toContain("# Acme vs Foo");
    expect(out).toContain("## Key Advantages");
    expect(out).toContain("### Speed");
    expect(out).toContain("Faster.");
    expect(out).toContain("| Feature | Acme | Foo |");
    expect(out).toContain("| Latency | 10ms | 100ms |");
    expect(out).toContain("| Price | $10 | $50 |");
  });
});

describe("toolConverter", () => {
  const convert = toolConverter({ siteUrl: SITE });

  it("renders minimal tool entry", () => {
    const out = convert({
      id: "calc",
      data: { title: "Calculator", description: "Math tool." },
      body: "Use it.",
    });
    expect(out).toContain("# Calculator");
    expect(out).toContain("> Math tool.");
    expect(out).toContain("/tools/calc");
    expect(out).toContain("Use it.");
  });
});

describe("videoConverter", () => {
  const convert = videoConverter({ siteUrl: SITE });

  it("renders video entry with URL", () => {
    const out = convert({
      id: "intro",
      data: {
        title: "Intro Video",
        description: "Watch it.",
        videoUrl: "https://youtube.com/watch?v=abc",
      },
    });
    expect(out).toContain("# Intro Video");
    expect(out).toContain("- **Video**: https://youtube.com/watch?v=abc");
    expect(out).toContain("/videos/intro");
  });
});

describe("featureConverter", () => {
  const convert = featureConverter({
    siteUrl: SITE,
    basePath: "/features",
    category: "Platform",
    siblings: [
      { slug: "alpha", title: "Alpha" },
      { slug: "beta", title: "Beta" },
    ],
  });

  it("renders title, problem/solution, FAQ, related siblings", () => {
    const out = convert({
      id: "alpha",
      data: {
        title: "Alpha",
        description: "First feature.",
        problem: [{ title: "Slow", content: "Things are slow." }],
        solution: [{ title: "Fast", content: "We make it fast." }],
        audience: ["Developers"],
        useCases: ["High-throughput apps"],
        docsUrl: "https://docs.acme.test/alpha",
        faqs: [{ question: "Is it ready?", answer: "Yes." }],
        related: [{ title: "Pricing", href: "/pricing" }],
      },
      body: "Long-form description.",
    });
    expect(out).toContain("# Alpha");
    expect(out).toContain("- **Category**: Platform");
    expect(out).toContain("- **Documentation**: https://docs.acme.test/alpha");
    expect(out).toContain("- **For**: Developers");
    expect(out).toContain("## The problem");
    expect(out).toContain("### Slow");
    expect(out).toContain("## The solution");
    expect(out).toContain("## Use cases");
    expect(out).toContain("- High-throughput apps");
    expect(out).toContain("## FAQ");
    expect(out).toContain("Is it ready?");
    expect(out).toContain("[Beta](https://acme.test/features/beta)");
    expect(out).not.toContain("[Alpha](https://acme.test/features/alpha)");
    expect(out).toContain("[Pricing](/pricing)");
  });

  it("works with minimal data", () => {
    const c = featureConverter({ siteUrl: SITE, basePath: "/x" });
    const out = c({ id: "y", data: { title: "Y" } });
    expect(out).toContain("# Y");
    expect(out).toContain("/x/y");
  });
});

describe("pseoConverter", () => {
  const convert = pseoConverter({ siteUrl: SITE, basePath: "/locations" });

  it("renders title, facts, related groups", () => {
    const out = convert({
      id: "san-francisco",
      data: {
        title: "San Francisco",
        description: "Marketing services in SF.",
        facts: [
          { label: "Region", value: "California" },
          { label: "Timezone", value: "PST" },
        ],
        related: [
          {
            title: "Nearby cities",
            basePath: "/locations",
            slugs: ["oakland", "berkeley"],
          },
          {
            title: "Services",
            basePath: "/services",
            slugs: ["seo", "content-marketing"],
          },
        ],
      },
      body: "Long-form intro.",
    });
    expect(out).toContain("# San Francisco");
    expect(out).toContain("- **Region**: California");
    expect(out).toContain("- **Timezone**: PST");
    expect(out).toContain("- **URL**: https://acme.test/locations/san-francisco");
    expect(out).toContain("## Nearby cities");
    expect(out).toContain("[Oakland](https://acme.test/locations/oakland)");
    expect(out).toContain("[Berkeley](https://acme.test/locations/berkeley)");
    expect(out).toContain("## Services");
    expect(out).toContain("[Seo](https://acme.test/services/seo)");
    expect(out).toContain("Long-form intro.");
  });

  it("supports uppercase title transform", () => {
    const out = convert({
      id: "x",
      data: {
        title: "X",
        related: [
          {
            title: "Currencies",
            basePath: "/currency",
            slugs: ["usd", "eur"],
            titleTransform: "uppercase",
          },
        ],
      },
    });
    expect(out).toContain("[USD](https://acme.test/currency/usd)");
    expect(out).toContain("[EUR](https://acme.test/currency/eur)");
  });

  it("supports custom title transform", () => {
    const out = convert({
      id: "x",
      data: {
        title: "X",
        related: [
          {
            title: "Custom",
            basePath: "/c",
            slugs: ["foo"],
            titleTransform: (slug) => `Custom-${slug}`,
          },
        ],
      },
    });
    expect(out).toContain("[Custom-foo](https://acme.test/c/foo)");
  });
});

describe("changelogConverter", () => {
  const convert = changelogConverter({ siteUrl: SITE });

  it("renders version, release date, and grouped changes", () => {
    const out = convert({
      id: "v1-2-0",
      data: {
        version: "1.2.0",
        title: "v1.2.0 -- Webhooks",
        releasedDate: new Date("2026-04-15T00:00:00Z"),
        summary: "Webhooks GA.",
        changes: [
          { type: "added", description: "New /webhooks endpoint" },
          { type: "added", description: "Retry logic with exponential backoff" },
          { type: "fixed", description: "Race condition in token refresh" },
          { type: "deprecated", description: "Legacy /events endpoint" },
        ],
      },
    });
    expect(out).toContain("# v1.2.0 -- Webhooks");
    expect(out).toContain("- **Version**: 1.2.0");
    expect(out).toContain("- **Released**: 2026-04-15");
    expect(out).toContain("## Added");
    expect(out).toContain("- New /webhooks endpoint");
    expect(out).toContain("- Retry logic with exponential backoff");
    expect(out).toContain("## Deprecated");
    expect(out).toContain("- Legacy /events endpoint");
    expect(out).toContain("## Fixed");
    expect(out).toContain("- Race condition in token refresh");
  });

  it("orders sections in canonical Keep-a-Changelog order", () => {
    const out = convert({
      id: "v",
      data: {
        version: "1.0.0",
        releasedDate: new Date("2026-01-01"),
        changes: [
          { type: "security", description: "Patched CVE" },
          { type: "added", description: "X" },
        ],
      },
    });
    const addedIdx = out.indexOf("## Added");
    const securityIdx = out.indexOf("## Security");
    expect(addedIdx).toBeGreaterThan(-1);
    expect(securityIdx).toBeGreaterThan(addedIdx);
  });
});

describe("pricingConverter", () => {
  const convert = pricingConverter({ siteUrl: SITE });

  it("renders tiers with name, price, highlights, CTA", () => {
    const out = convert({
      id: "main",
      data: {
        title: "Pricing",
        description: "Simple, transparent pricing.",
        tiers: [
          {
            name: "Starter",
            price: "$0",
            billingPeriod: "month",
            description: "For trying it out.",
            highlights: ["1 project", "Community support"],
            cta: { label: "Start free", href: "/signup" },
          },
          {
            name: "Pro",
            price: "$29",
            billingPeriod: "month",
            highlights: ["Unlimited projects", "Email support"],
            recommended: true,
            cta: { label: "Upgrade", href: "/upgrade" },
          },
        ],
        faqs: [{ question: "Can I cancel?", answer: "Yes, anytime." }],
      },
    });
    expect(out).toContain("# Pricing");
    expect(out).toContain("> Simple, transparent pricing.");
    expect(out).toContain("### Starter");
    expect(out).toContain("**$0** / month");
    expect(out).toContain("- 1 project");
    expect(out).toContain("[Start free](/signup)");
    expect(out).toContain("### Pro -- recommended");
    expect(out).toContain("**$29** / month");
    expect(out).toContain("- Unlimited projects");
    expect(out).toContain("[Upgrade](/upgrade)");
    expect(out).toContain("## FAQ");
    expect(out).toContain("Can I cancel?");
  });

  it("handles tiers without billing period (one-time)", () => {
    const out = convert({
      id: "lifetime",
      data: {
        title: "Lifetime",
        tiers: [{ name: "Lifetime", price: "$199" }],
      },
    });
    expect(out).toContain("**$199**");
    expect(out).not.toContain("/ undefined");
  });
});

describe("docsConverter", () => {
  const convert = docsConverter({ siteUrl: SITE });

  it("renders title, section, and updated date", () => {
    const out = convert({
      id: "getting-started",
      data: {
        title: "Getting Started",
        description: "Install and run.",
        section: "guides",
        updatedDate: new Date("2026-04-30T00:00:00Z"),
      },
      body: "## Step 1\n\n...",
    });
    expect(out).toContain("# Getting Started");
    expect(out).toContain("> Install and run.");
    expect(out).toContain("- **Section**: guides");
    expect(out).toContain("- **URL**: https://acme.test/docs/getting-started");
    expect(out).toContain("- **Updated**: 2026-04-30");
    expect(out).toContain("## Step 1");
  });

  it("works with minimal data", () => {
    const out = convert({ id: "x", data: { title: "X" } });
    expect(out).toContain("# X");
    expect(out).toContain("/docs/x");
  });
});

describe("apiReferenceConverter", () => {
  const convert = apiReferenceConverter({ siteUrl: SITE });

  it("renders basic api-reference", () => {
    const out = convert({
      id: "get-users",
      data: {
        title: "Get Users",
        summary: "Returns all users",
        method: "get",
        path: "/users",
      },
    });
    expect(out).toContain("# Get Users");
    expect(out).toContain("> Returns all users");
    expect(out).toContain("- **Method**: GET");
    expect(out).toContain("- **Path**: `/users`");
    expect(out).toContain("- **URL**: https://acme.test/docs/get-users");
  });

  it("renders parameters, request body, responses, and code samples", () => {
    const out = convert({
      id: "post-users",
      data: {
        title: "Post User",
        method: "post",
        path: "/users",
        parameters: [
          { name: "id", in: "query", required: true, schema: { type: "string" }, description: "User ID" },
        ],
        requestBody: {
          description: "Body desc",
          content: { "application/json": {} },
        },
        responses: {
          "200": { description: "Success" },
        },
        codeSamples: [
          { lang: "bash", source: "curl x" },
        ],
      },
    });
    expect(out).toContain("## Parameters");
    expect(out).toContain("| `id` | query | `string` | Yes | User ID |");
    expect(out).toContain("## Request Body");
    expect(out).toContain("Body desc");
    expect(out).toContain("**Content-Type**: `application/json`");
    expect(out).toContain("## Responses");
    expect(out).toContain("### 200");
    expect(out).toContain("Success");
    expect(out).toContain("## Code Samples");
    expect(out).toContain("```bash\ncurl x\n```");
  });
});

describe("fromOpenAPI", () => {
  it("throws if operationId not found", () => {
    expect(() => fromOpenAPI(PETSTORE_SPEC, "missingOp")).toThrowError(
      /Dualmark: operationId 'missingOp' not found. Available ids: getPetById, updatePet/
    );
  });

  it("extracts getPetById properly with nested refs and params", () => {
    const entry = fromOpenAPI(PETSTORE_SPEC, "getPetById");
    expect(entry.id).toBe("getPetById");
    expect(entry.data.title).toBe("Find pet by ID");
    expect(entry.data.method).toBe("get");
    expect(entry.data.path).toBe("/pets/{petId}");
    expect(entry.data.parameters).toHaveLength(2);
    const tenantParam = entry.data.parameters!.find(p => p.name === "tenant");
    expect(tenantParam?.required).toBe(true);

    const res200 = entry.data.responses?.["200"];
    expect(res200!.description).toBe("successful operation");
    const schema = res200!.content!["application/json"].schema!;
    expect(schema.properties!.category.properties!.parent.$ref).toBe("#/components/schemas/Category");
    
    // Nullable schema 3.1
    expect(schema.properties!.nickname.type).toEqual(["string", "null"]);

    expect(entry.data.codeSamples).toHaveLength(1);
    expect(entry.data.codeSamples![0].lang).toBe("curl");
  });

  it("extracts updatePet with request body", () => {
    const entry = fromOpenAPI(PETSTORE_SPEC, "updatePet");
    expect(entry.data.requestBody).toBeDefined();
    expect(entry.data.requestBody!.content!["application/json"].schema!.properties!.name.type).toBe("string");
  });
});

describe("BUILT_IN_CONVERTERS export", () => {
  it("lists all built-in names in alphabetical order", () => {
    expect(BUILT_IN_CONVERTERS).toEqual([
      "api-reference",
      "blog",
      "case-study",
      "changelog",
      "compare",
      "docs",
      "feature",
      "glossary",
      "integration",
      "legal",
      "pricing",
      "pseo",
      "status-page",
      "tool",
      "video",
    ]);
  });
});
