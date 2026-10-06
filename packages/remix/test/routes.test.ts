import { describe, expect, it } from "vitest";
import { createRouteSpecs, toReactRouterPath } from "../src/routes.js";

describe("createRouteSpecs", () => {
  it("creates route specs for single slug collections, static pages, and llms.txt", () => {
    const specs = createRouteSpecs({
      siteUrl: "https://example.com",
      collections: {
        posts: { converter: "blog", slugStrategy: "single", getEntries: () => [] },
      },
      staticPages: [{ pattern: "/", render: () => "# Home" }],
      llmsTxt: { enabled: true, brandName: "Example", sections: [] },
    });

    expect(specs.map((spec) => spec.routePath)).toEqual([
      "posts/:slug.md",
      "posts.md",
      "index.md",
      "llms.txt",
    ]);
  });

  it("converts bracket params to React Router params", () => {
    expect(toReactRouterPath("/tax/[country].md")).toBe("tax/:country.md");
    expect(toReactRouterPath("/products/[category]/[slug].md")).toBe(
      "products/:category/:slug.md",
    );
  });

  it("uses React Router param syntax for parameterized route specs", () => {
    const specs = createRouteSpecs({
      siteUrl: "https://example.com",
      parameterizedRoutes: [
        {
          pattern: "/tax/[country]",
          getStaticPaths: () => [{ params: { country: "us" } }],
          render: ({ params }) => `# Tax ${params.country}`,
        },
      ],
    });

    expect(specs.map((spec) => spec.routePath)).toEqual(["tax/:country.md"]);
  });

  it("generates safe file names for nested URL paths", () => {
    const specs = createRouteSpecs({
      siteUrl: "https://example.com",
      staticPages: [{ pattern: "/docs/windows", render: () => "# Docs" }],
    });

    expect(specs[0]?.fileName).toBe("docs-windows-md.ts");
  });
});
