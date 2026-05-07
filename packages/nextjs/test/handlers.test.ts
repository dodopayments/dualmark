import { describe, it, expect } from "vitest";
import { createDualmarkRouteHandler } from "../src/handlers/markdown-route.js";
import { createLlmsTxtHandler } from "../src/handlers/llms-txt.js";

interface BlogEntry {
  id: string;
  data: { title: string; description?: string; publishedDate: Date };
  body: string;
}

const POSTS: BlogEntry[] = [
  {
    id: "hello",
    data: {
      title: "Hello",
      description: "First post",
      publishedDate: new Date("2026-01-01T00:00:00Z"),
    },
    body: "Body of hello.",
  },
  {
    id: "world",
    data: {
      title: "World",
      publishedDate: new Date("2026-01-02T00:00:00Z"),
    },
    body: "Body of world.",
  },
];

function makeReq(url = "https://example.com/md/anything"): Request {
  return new Request(url);
}

function ctx(path: string[]): { params: Promise<{ path: string[] }> } {
  return { params: Promise.resolve({ path }) };
}

describe("createDualmarkRouteHandler — collection detail", () => {
  const handler = createDualmarkRouteHandler({
    siteUrl: "https://example.com",
    collections: {
      blog: {
        converter: "blog",
        getEntries: () => POSTS,
      },
    },
  });

  it("serves a known post as markdown", async () => {
    const res = await handler.GET(makeReq(), ctx(["blog", "hello"]));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    const body = await res.text();
    expect(body).toContain("# Hello");
  });

  it("returns 404 for unknown post", async () => {
    const res = await handler.GET(makeReq(), ctx(["blog", "missing"]));
    expect(res.status).toBe(404);
  });
});

describe("createDualmarkRouteHandler — collection listing", () => {
  const handler = createDualmarkRouteHandler({
    siteUrl: "https://example.com",
    collections: {
      blog: {
        converter: "blog",
        getEntries: () => POSTS,
        listingMetadata: { title: "Blog", description: "All posts." },
      },
    },
  });

  it("renders the listing", async () => {
    const res = await handler.GET(makeReq(), ctx(["blog"]));
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("# Blog");
    expect(body).toContain("> All posts.");
    expect(body).toContain("[Hello](/blog/hello)");
    expect(body).toContain("[World](/blog/world)");
  });

  it("respects emitListing=false", async () => {
    const noListing = createDualmarkRouteHandler({
      siteUrl: "https://example.com",
      collections: {
        blog: {
          converter: "blog",
          getEntries: () => POSTS,
          emitListing: false,
        },
      },
    });
    const res = await noListing.GET(makeReq(), ctx(["blog"]));
    expect(res.status).toBe(404);
  });
});

describe("createDualmarkRouteHandler — static pages", () => {
  const handler = createDualmarkRouteHandler({
    siteUrl: "https://example.com",
    staticPages: [
      { pattern: "/", render: () => "# Home\n\nWelcome." },
      { pattern: "/about", render: async () => "# About" },
    ],
  });

  it("serves the root static page at /index", async () => {
    const res = await handler.GET(makeReq(), ctx(["index"]));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("# Home\n\nWelcome.");
  });

  it("serves a non-root static page", async () => {
    const res = await handler.GET(makeReq(), ctx(["about"]));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("# About");
  });
});

describe("createDualmarkRouteHandler — parameterized routes", () => {
  const handler = createDualmarkRouteHandler({
    siteUrl: "https://example.com",
    parameterizedRoutes: [
      {
        pattern: "/tax/[country]",
        getStaticPaths: () => [{ params: { country: "us" } }, { params: { country: "uk" } }],
        render: ({ params }) => `# Tax: ${params.country.toUpperCase()}`,
      },
    ],
  });

  it("renders a known param", async () => {
    const res = await handler.GET(makeReq(), ctx(["tax", "us"]));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("# Tax: US");
  });
});

describe("createDualmarkRouteHandler — generateStaticParams", () => {
  it("emits paths for collections + listing + static + parameterized", async () => {
    const handler = createDualmarkRouteHandler({
      siteUrl: "https://example.com",
      collections: {
        blog: { converter: "blog", getEntries: () => POSTS },
      },
      staticPages: [
        { pattern: "/", render: () => "# Home" },
        { pattern: "/about", render: () => "# About" },
      ],
      parameterizedRoutes: [
        {
          pattern: "/tax/[country]",
          getStaticPaths: () => [{ params: { country: "us" } }],
          render: ({ params }) => `# ${params.country}`,
        },
      ],
    });
    const params = await handler.generateStaticParams();
    const paths = params.map((p) => "/" + p.path.join("/"));
    expect(paths).toContain("/index");
    expect(paths).toContain("/about");
    expect(paths).toContain("/blog");
    expect(paths).toContain("/blog/hello");
    expect(paths).toContain("/blog/world");
    expect(paths).toContain("/tax/us");
  });
});

describe("createDualmarkRouteHandler — custom converter function", () => {
  it("uses the function directly without registry lookup", async () => {
    const handler = createDualmarkRouteHandler({
      siteUrl: "https://example.com",
      collections: {
        notes: {
          converter: (entry) => `# ${(entry.data as { title?: string }).title ?? entry.id}`,
          getEntries: () => [{ id: "x", data: { title: "X" } as never }],
        },
      },
    });
    const res = await handler.GET(makeReq(), ctx(["notes", "x"]));
    expect(await res.text()).toBe("# X");
  });
});

describe("createLlmsTxtHandler", () => {
  it("serves text/plain with noindex", async () => {
    const handler = createLlmsTxtHandler({
      brandName: "Acme",
      description: "Widgets.",
      sections: [
        {
          title: "Pages",
          links: [{ title: "Home", href: "https://acme.test/" }],
        },
      ],
    });
    const res = handler.GET();
    expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
    const body = await res.text();
    expect(body).toContain("# Acme");
    expect(body).toContain("> Widgets.");
    expect(body).toContain("[Home](https://acme.test/)");
  });
});
