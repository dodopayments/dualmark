import { describe, expect, it } from "vitest";
import { createDualmarkRouteHandler, createLlmsTxtHandler } from "../src/handlers.js";
import type { DualmarkSvelteKitConfig } from "../src/types.js";

const config: DualmarkSvelteKitConfig = {
  siteUrl: "https://example.com",
  collections: {
    posts: {
      converter: "blog",
      getEntries: () => [
        {
          id: "hello",
          data: {
            title: "Hello",
            description: "A first post",
            author: "Dualmark",
            publishedDate: new Date("2026-01-01T00:00:00Z"),
          },
          body: "Welcome to SvelteKit.",
        },
      ],
      listingMetadata: {
        title: "Posts",
        description: "All posts.",
      },
    },
  },
  staticPages: [{ pattern: "/", render: () => "# Home" }],
  parameterizedRoutes: [
    {
      pattern: "/topics/[topic]",
      getStaticPaths: () => [{ params: { topic: "aeo" } }],
      render: ({ params }) => `# ${params.topic}`,
    },
  ],
  llmsTxt: {
    enabled: true,
    brandName: "Example",
    sections: [{ title: "Posts", links: [{ title: "Hello", href: "/posts/hello" }] }],
  },
};

describe("createDualmarkRouteHandler", () => {
  it("returns 200 text/markdown for a collection detail .md URL", async () => {
    const handler = createDualmarkRouteHandler(config);
    const response = await handler.GET({ url: new URL("https://example.com/posts/hello.md") });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(await response.text()).toContain("# Hello");
  });

  it("returns 200 text/markdown for a generated listing route", async () => {
    const handler = createDualmarkRouteHandler(config);
    const response = await handler.GET({ url: new URL("https://example.com/posts.md") });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(await response.text()).toContain("# Posts");
  });

  it("maps /index.md to the configured root static page", async () => {
    const handler = createDualmarkRouteHandler(config);
    const response = await handler.GET({ url: new URL("https://example.com/index.md") });

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("# Home");
  });

  it("renders configured parameterized routes", async () => {
    const handler = createDualmarkRouteHandler(config);
    const response = await handler.GET({ url: new URL("https://example.com/topics/aeo.md") });

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("# aeo");
  });

  it("generates SvelteKit entries for dynamic collection and parameterized routes", async () => {
    const collection = createDualmarkRouteHandler(config, {
      kind: "collection-detail",
      collectionName: "posts",
    });
    const parameterized = createDualmarkRouteHandler(config, {
      kind: "parameterized",
      pattern: "/topics/[topic]",
    });

    expect(await collection.entries()).toEqual([{ slug: "hello" }]);
    expect(await parameterized.entries()).toEqual([{ topic: "aeo" }]);
  });
});

describe("createLlmsTxtHandler", () => {
  it("returns llms.txt with text/plain content-type", () => {
    const handler = createLlmsTxtHandler(config);
    const response = handler.GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
  });
});

describe("tokenizer option", () => {
  it("uses custom tokenizer for X-Markdown-Tokens header", async () => {
    const charCounter = (text: string) => text.length;
    const configWithTokenizer: DualmarkSvelteKitConfig = {
      ...config,
      tokenizer: charCounter,
    };
    const handler = createDualmarkRouteHandler(configWithTokenizer);
    const response = await handler.GET({ url: new URL("https://example.com/index.md") });

    expect(response.status).toBe(200);
    const body = await response.clone().text();
    const tokens = response.headers.get("x-markdown-tokens");
    expect(Number(tokens)).toBe(body.length);
  });

  it("falls back to default word counter when no tokenizer is provided", async () => {
    const handler = createDualmarkRouteHandler(config);
    const response = await handler.GET({ url: new URL("https://example.com/index.md") });

    expect(response.status).toBe(200);
    const tokens = response.headers.get("x-markdown-tokens");
    expect(Number(tokens)).toBe(2);
  });
});
