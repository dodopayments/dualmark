import { describe, expect, it } from "vitest";
import { createDualmarkResourceRoute, createLlmsTxtResourceRoute } from "../src/handlers.js";
import type { DualmarkRemixConfig } from "../src/types.js";

function titleFromData(data: unknown): string {
  if (typeof data === "object" && data !== null && "title" in data) {
    const title = data.title;
    return typeof title === "string" ? title : "Untitled";
  }
  return "Untitled";
}

const config: DualmarkRemixConfig = {
  siteUrl: "https://example.com",
  collections: {
    posts: {
      converter: (entry) => `# ${titleFromData(entry.data)}\n\n${entry.body}`,
      route: "posts",
      slugStrategy: "single",
      getEntries: () => [
        {
          id: "hello",
          data: { title: "Hello", description: "Intro" },
          body: "Hello body.",
        },
      ],
      listingMetadata: {
        title: "Posts",
        description: "All posts.",
      },
    },
  },
  staticPages: [{ pattern: "/", render: () => "# Home\n\nWelcome." }],
  parameterizedRoutes: [
    {
      pattern: "/tax/[country]",
      getStaticPaths: () => [{ params: { country: "us" } }],
      render: ({ params }) => `# Tax ${params.country}`,
    },
  ],
  llmsTxt: { enabled: true, brandName: "Example", sections: [] },
};

describe("createDualmarkResourceRoute", () => {
  it("serves static page markdown for /index.md", async () => {
    const handler = createDualmarkResourceRoute(config);

    const response = await handler.loader({
      request: new Request("https://example.com/index.md"),
      params: {},
    });

    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(await response.text()).toContain("# Home");
  });

  it("serves collection detail markdown for /posts/hello.md", async () => {
    const handler = createDualmarkResourceRoute(config);

    const response = await handler.loader({
      request: new Request("https://example.com/posts/hello.md"),
      params: { slug: "hello" },
    });

    expect(await response.text()).toContain("# Hello");
  });

  it("limits collection detail targets to the generated collection", async () => {
    const handler = createDualmarkResourceRoute(config, {
      kind: "collection-detail",
      collectionName: "missing",
    });

    const response = await handler.loader({
      request: new Request("https://example.com/posts/hello.md"),
      params: { slug: "hello" },
    });

    expect(response.status).toBe(404);
  });

  it("uses React Router params for targeted parameterized routes", async () => {
    const handler = createDualmarkResourceRoute(config, {
      kind: "parameterized",
      pattern: "/tax/[country]",
    });

    const response = await handler.loader({
      request: new Request("https://example.com/tax/us.md"),
      params: { country: "ca" },
    });

    expect(await response.text()).toContain("# Tax ca");
  });

  it("returns 405 for actions", async () => {
    const handler = createDualmarkResourceRoute(config);

    const response = await handler.action({
      request: new Request("https://example.com/posts/hello.md", { method: "POST" }),
      params: { slug: "hello" },
    });

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD");
  });
});

describe("createLlmsTxtResourceRoute", () => {
  it("serves llms.txt", async () => {
    const handler = createLlmsTxtResourceRoute(config);

    const response = await handler.loader({
      request: new Request("https://example.com/llms.txt"),
      params: {},
    });

    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(await response.text()).toContain("# Example");
  });
});
