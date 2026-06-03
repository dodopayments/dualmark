import { describe, it, expect, beforeEach, vi } from "vitest";
import { createAEOMiddleware } from "../src/index.js";
import type { AssetFetcher, UpstreamHandler, VercelEdgeContext } from "../src/types.js";

function makeAssets(files: Record<string, string>): AssetFetcher {
  return async (req, _init?) => {
    const url = req instanceof URL ? req : new URL(String(req));
    const body = files[url.pathname];
    if (body === undefined) return new Response("Not found", { status: 404 });
    return new Response(body, { status: 200 });
  };
}

function makeUpstream(handler: (req: Request) => Response | Promise<Response>): UpstreamHandler {
  return async (req) => handler(req);
}

function makeCtx(): VercelEdgeContext {
  const promises: Promise<unknown>[] = [];
  return {
    waitUntil: (p) => {
      promises.push(p);
    },
  };
}

describe("createAEOMiddleware — markdown serving", () => {
  let fetchAsset: AssetFetcher;
  beforeEach(() => {
    fetchAsset = makeAssets({
      "/blog/post-1.md": "# Post 1\n\nBody.",
      "/index.md": "# Home\n\nWelcome.",
    });
  });

  it("serves markdown to AI bot UA on existing path", async () => {
    const middleware = createAEOMiddleware({
      upstream: makeUpstream(
        () => new Response("html", { headers: { "Content-Type": "text/html" } }),
      ),
      fetchAsset,
    });
    const req = new Request("https://acme.test/blog/post-1", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await middleware(req, makeCtx());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(res.headers.get("x-markdown-tokens")).toBe("4");
    expect(res.headers.get("x-aeo-version")).toBe("1.0");
    expect(res.headers.get("vary")).toBe("Accept");
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
    expect(await res.text()).toBe("# Post 1\n\nBody.");
  });

  it("serves markdown when Accept: text/markdown (no bot UA)", async () => {
    const middleware = createAEOMiddleware({
      upstream: makeUpstream(
        () => new Response("html", { headers: { "Content-Type": "text/html" } }),
      ),
      fetchAsset,
    });
    const req = new Request("https://acme.test/blog/post-1", {
      headers: { accept: "text/markdown" },
    });
    const res = await middleware(req, makeCtx());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
  });

  it("returns 406 when Accept rules out html and markdown", async () => {
    const middleware = createAEOMiddleware({
      upstream: makeUpstream(
        () => new Response("html", { headers: { "Content-Type": "text/html" } }),
      ),
      fetchAsset,
    });
    const req = new Request("https://acme.test/blog/post-1", {
      headers: { accept: "image/png" },
    });
    const res = await middleware(req, makeCtx());
    expect(res.status).toBe(406);
    expect(res.headers.get("vary")).toBe("Accept");
  });

  it("falls through to upstream for browser UA", async () => {
    const upstreamMock = vi.fn(
      (_req: Request) =>
        new Response("<html>x</html>", { headers: { "Content-Type": "text/html" } }),
    );
    const middleware = createAEOMiddleware({
      upstream: async (req) => upstreamMock(req),
      fetchAsset,
    });
    const req = new Request("https://acme.test/blog/post-1", {
      headers: {
        "user-agent": "Mozilla/5.0 Chrome/130",
        accept: "text/html,*/*;q=0.8",
      },
    });
    const res = await middleware(req, makeCtx());
    expect(upstreamMock).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
    const link = res.headers.get("link") ?? "";
    expect(link).toContain('</blog/post-1.md>; rel="alternate"; type="text/markdown"');
    expect(res.headers.get("vary")).toContain("Accept");
  });

  it("handles missing .md (cache miss) for bot — falls to upstream", async () => {
    const upstreamMock = vi.fn(
      (_req: Request) =>
        new Response("<html>404</html>", {
          status: 404,
          headers: { "Content-Type": "text/html" },
        }),
    );
    const middleware = createAEOMiddleware({
      upstream: async (req) => upstreamMock(req),
      fetchAsset,
    });
    const req = new Request("https://acme.test/blog/missing", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await middleware(req, makeCtx());
    expect(upstreamMock).toHaveBeenCalledOnce();
    expect(res.status).toBe(404);
  });

  it("serves index.md for root path", async () => {
    const middleware = createAEOMiddleware({
      upstream: makeUpstream(() => new Response("html")),
      fetchAsset,
    });
    const req = new Request("https://acme.test/", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await middleware(req, makeCtx());
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("# Home\n\nWelcome.");
  });

  it("decorates direct .md requests with full AEO headers from fetchAsset", async () => {
    const middleware = createAEOMiddleware({
      upstream: makeUpstream(() => new Response("should-not-be-called", { status: 500 })),
      fetchAsset,
    });
    const req = new Request("https://acme.test/blog/post-1.md");
    const res = await middleware(req, makeCtx());
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
    expect(res.headers.get("X-Markdown-Tokens")).toMatch(/^\d+$/);
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
    expect(res.headers.get("Vary")).toBe("Accept");
    expect(res.headers.get("X-AEO-Version")).toBe("1.0");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(await res.text()).toBe("# Post 1\n\nBody.");
  });

  it("returns 404 for direct .md request when asset missing", async () => {
    const middleware = createAEOMiddleware({
      upstream: makeUpstream(() => new Response("html")),
      fetchAsset,
    });
    const req = new Request("https://acme.test/missing.md");
    const res = await middleware(req, makeCtx());
    expect(res.status).toBe(404);
  });
});

describe("createAEOMiddleware — trailing slash", () => {
  const fetchAsset = makeAssets({});

  it("redirects /path/ → /path with 301 by default", async () => {
    const middleware = createAEOMiddleware({
      upstream: makeUpstream(() => new Response("ok")),
      fetchAsset,
    });
    const req = new Request("https://acme.test/blog/");
    const res = await middleware(req, makeCtx());
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://acme.test/blog");
  });

  it("preserves trailing slash with mode=preserve", async () => {
    const upstream = vi.fn(
      (_req: Request) => new Response("ok", { headers: { "Content-Type": "text/html" } }),
    );
    const middleware = createAEOMiddleware({
      upstream: async (req) => upstream(req),
      fetchAsset,
      trailingSlash: "preserve",
    });
    const req = new Request("https://acme.test/blog/");
    const res = await middleware(req, makeCtx());
    expect(res.status).toBe(200);
    expect(upstream).toHaveBeenCalledOnce();
  });

  it("redirects /path → /path/ with mode=always", async () => {
    const middleware = createAEOMiddleware({
      upstream: makeUpstream(() => new Response("ok")),
      fetchAsset,
      trailingSlash: "always",
    });
    const req = new Request("https://acme.test/blog");
    const res = await middleware(req, makeCtx());
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://acme.test/blog/");
  });
});

describe("createAEOMiddleware — redirects", () => {
  let fetchAsset: AssetFetcher;
  beforeEach(() => {
    fetchAsset = makeAssets({ "/new-path.md": "# New\n\nMoved." });
  });

  it("follows internal redirect for AI bot to canonical .md", async () => {
    const middleware = createAEOMiddleware({
      upstream: makeUpstream(() => new Response("html")),
      fetchAsset,
      redirects: { internal: { "/old-path": "/new-path" } },
    });
    const req = new Request("https://acme.test/old-path", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await middleware(req, makeCtx());
    expect(res.status).toBe(200);
    expect(res.headers.get("x-redirect-from")).toBe("/old-path");
    expect(res.headers.get("x-redirect-to")).toBe("/new-path");
    expect(await res.text()).toContain("# New");
  });

  it("returns markdown notice for external redirect", async () => {
    const middleware = createAEOMiddleware({
      upstream: makeUpstream(() => new Response("html")),
      fetchAsset,
      redirects: { external: { "/login": "https://app.example.com" } },
    });
    const req = new Request("https://acme.test/login", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await middleware(req, makeCtx());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(res.headers.get("x-redirect-to")).toBe("https://app.example.com");
    expect(await res.text()).toContain("https://app.example.com");
  });
});

describe("createAEOMiddleware — skip rules", () => {
  const fetchAsset = makeAssets({});

  it("skips /api/ paths entirely", async () => {
    const upstream = vi.fn((_req: Request) => new Response("api"));
    const middleware = createAEOMiddleware({
      upstream: async (req) => upstream(req),
      fetchAsset,
    });
    const req = new Request("https://acme.test/api/foo", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await middleware(req, makeCtx());
    expect(upstream).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
  });

  it("skips asset extensions", async () => {
    const upstream = vi.fn(
      (_req: Request) => new Response(".css", { headers: { "Content-Type": "text/css" } }),
    );
    const middleware = createAEOMiddleware({
      upstream: async (req) => upstream(req),
      fetchAsset,
    });
    const req = new Request("https://acme.test/style.css", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    await middleware(req, makeCtx());
    expect(upstream).toHaveBeenCalledOnce();
  });

  it("does not inject Link header on non-html responses", async () => {
    const middleware = createAEOMiddleware({
      upstream: makeUpstream(
        () => new Response("{}", { headers: { "Content-Type": "application/json" } }),
      ),
      fetchAsset,
    });
    const req = new Request("https://acme.test/data");
    const res = await middleware(req, makeCtx());
    expect(res.headers.get("link")).toBeNull();
  });
});

describe("createAEOMiddleware — hooks", () => {
  it("calls onAIRequest on hit", async () => {
    const onAIRequest = vi.fn();
    const fetchAsset = makeAssets({ "/p.md": "# p" });
    const middleware = createAEOMiddleware({
      upstream: makeUpstream(() => new Response("html")),
      fetchAsset,
      hooks: { onAIRequest },
    });
    await middleware(
      new Request("https://acme.test/p", { headers: { "user-agent": "GPTBot/1.0" } }),
      makeCtx(),
    );
    expect(onAIRequest).toHaveBeenCalledOnce();
    const info = onAIRequest.mock.calls[0]?.[0];
    expect(info.botName).toBe("GPTBot");
    expect(info.cacheStatus).toBe("hit");
  });

  it("calls onMiss on cache miss", async () => {
    const onMiss = vi.fn();
    const fetchAsset = makeAssets({});
    const middleware = createAEOMiddleware({
      upstream: makeUpstream(() => new Response("404", { status: 404 })),
      fetchAsset,
      hooks: { onMiss },
    });
    await middleware(
      new Request("https://acme.test/q", { headers: { "user-agent": "GPTBot/1.0" } }),
      makeCtx(),
    );
    expect(onMiss).toHaveBeenCalledOnce();
  });

  it("calls onAIRequest without context (no waitUntil)", async () => {
    const onAIRequest = vi.fn();
    const fetchAsset = makeAssets({ "/p.md": "# p" });
    const middleware = createAEOMiddleware({
      upstream: makeUpstream(() => new Response("html")),
      fetchAsset,
      hooks: { onAIRequest },
    });
    await middleware(
      new Request("https://acme.test/p", { headers: { "user-agent": "GPTBot/1.0" } }),
    );
    expect(onAIRequest).toHaveBeenCalledOnce();
  });
});

describe("createAEOMiddleware — Link header injection", () => {
  const fetchAsset = makeAssets({});

  it("preserves existing Link header values", async () => {
    const middleware = createAEOMiddleware({
      upstream: makeUpstream(
        () =>
          new Response("<html></html>", {
            headers: {
              "Content-Type": "text/html",
              Link: "</style.css>; rel=preload; as=style",
            },
          }),
      ),
      fetchAsset,
    });
    const res = await middleware(new Request("https://acme.test/page"), makeCtx());
    const link = res.headers.get("link") ?? "";
    expect(link).toContain("</style.css>; rel=preload; as=style");
    expect(link).toContain('</page.md>; rel="alternate"; type="text/markdown"');
  });

  it("can be disabled via enableLinkHeader=false", async () => {
    const middleware = createAEOMiddleware({
      upstream: makeUpstream(
        () => new Response("<html></html>", { headers: { "Content-Type": "text/html" } }),
      ),
      fetchAsset,
      enableLinkHeader: false,
    });
    const res = await middleware(new Request("https://acme.test/page"), makeCtx());
    expect(res.headers.get("link")).toBeNull();
  });
});

describe("createAEOMiddleware — edge cases", () => {
  it("handles fetchAsset throwing an error gracefully", async () => {
    const fetchAsset: AssetFetcher = async () => {
      throw new Error("network error");
    };
    const upstream = vi.fn(
      (_req: Request) => new Response("html", { headers: { "Content-Type": "text/html" } }),
    );
    const middleware = createAEOMiddleware({
      upstream: async (req) => upstream(req),
      fetchAsset,
    });
    const req = new Request("https://acme.test/blog/post", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await middleware(req, makeCtx());
    expect(upstream).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
  });

  it("handles root path .md request", async () => {
    const fetchAsset = makeAssets({ "/index.md": "# Root" });
    const middleware = createAEOMiddleware({
      upstream: makeUpstream(() => new Response("html")),
      fetchAsset,
    });
    const req = new Request("https://acme.test/", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await middleware(req, makeCtx());
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("# Root");
  });

  it("does not redirect root path with trailing slash in never mode", async () => {
    const fetchAsset = makeAssets({ "/index.md": "# Root" });
    const upstream = vi.fn(
      (_req: Request) => new Response("html", { headers: { "Content-Type": "text/html" } }),
    );
    const middleware = createAEOMiddleware({
      upstream: async (req) => upstream(req),
      fetchAsset,
      trailingSlash: "never",
    });
    const req = new Request("https://acme.test/");
    const res = await middleware(req, makeCtx());
    expect(res.status).not.toBe(301);
  });

  it("skips paths matching custom prefixes", async () => {
    const upstream = vi.fn((_req: Request) => new Response("ok"));
    const middleware = createAEOMiddleware({
      upstream: async (req) => upstream(req),
      fetchAsset: makeAssets({}),
      skip: { prefixes: ["/internal"] },
    });
    const req = new Request("https://acme.test/internal/page", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await middleware(req, makeCtx());
    expect(upstream).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
  });

  it("skips paths matching custom extensions", async () => {
    const upstream = vi.fn(
      (_req: Request) => new Response("data", { headers: { "Content-Type": "application/xml" } }),
    );
    const middleware = createAEOMiddleware({
      upstream: async (req) => upstream(req),
      fetchAsset: makeAssets({}),
      skip: { extensions: [".xml"] },
    });
    const req = new Request("https://acme.test/feed.xml", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await middleware(req, makeCtx());
    expect(upstream).toHaveBeenCalledOnce();
  });
});

describe("createAEOMiddleware — subrequest detection", () => {
  it("returns passthrough response for subrequest header", async () => {
    const fetchAsset = makeAssets({});
    const upstream = vi.fn((_req: Request) => new Response("should-not-be-called"));
    const middleware = createAEOMiddleware({
      upstream: async (req) => upstream(req),
      fetchAsset,
    });
    const req = new Request("https://acme.test/blog/post", {
      headers: { "x-dualmark-subrequest": "1" },
    });
    const res = await middleware(req, makeCtx());
    // NextResponse.next() is available → returns 200 passthrough
    expect(res.status).toBe(200);
    expect(upstream).not.toHaveBeenCalled();
  });
});
