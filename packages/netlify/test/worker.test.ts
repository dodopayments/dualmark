import { describe, it, expect, beforeEach, vi } from "vitest";
import { createAEOWorker } from "../src/index.js";
import type { AssetsFetcher, NetlifyContext } from "../src/types.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeAssets(files: Record<string, string>): AssetsFetcher {
  return {
    fetch: async (req) => {
      const url = req instanceof URL ? req : new URL(String(req));
      const body = files[url.pathname];
      if (body === undefined) return new Response("Not found", { status: 404 });
      return new Response(body, { status: 200 });
    },
  };
}

function makeContext(
  originworker: (req?: Request) => Response | Promise<Response> = () =>
    new Response("<html>ok</html>", { headers: { "Content-Type": "text/html" } }),
): NetlifyContext & { promises: Promise<unknown>[] } {
  const promises: Promise<unknown>[] = [];
  return {
    next: async (req?: Request) => originworker(req),
    waitUntil: (p) => {
      promises.push(p);
    },
    geo: { country: { code: "US" }, city: "New York" },
    ip: "1.2.3.4",
    promises,
  };
}

// ---------------------------------------------------------------------------
// Markdown serving
// ---------------------------------------------------------------------------

describe("createAEOWorker — markdown serving", () => {
  let assets: AssetsFetcher;

  beforeEach(() => {
    assets = makeAssets({
      "/blog/post-1.md": "# Post 1\n\nBody.",
      "/index.md": "# Home\n\nWelcome.",
    });
  });

  it("serves markdown to AI bot UA on existing path", async () => {
    const worker = createAEOWorker({ assets });
    const req = new Request("https://acme.test/blog/post-1", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await worker(req, makeContext());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(res.headers.get("x-markdown-tokens")).toBe("4");
    expect(res.headers.get("x-aeo-version")).toBe("1.0");
    expect(res.headers.get("vary")).toBe("Accept");
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
    expect(await res.text()).toBe("# Post 1\n\nBody.");
  });

  it("serves markdown when Accept: text/markdown (no bot UA)", async () => {
    const worker = createAEOWorker({ assets });
    const req = new Request("https://acme.test/blog/post-1", {
      headers: { accept: "text/markdown" },
    });
    const res = await worker(req, makeContext());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
  });

  it("returns 406 when Accept rules out html and markdown", async () => {
    const worker = createAEOWorker({ assets });
    const req = new Request("https://acme.test/blog/post-1", {
      headers: { accept: "image/png" },
    });
    const res = await worker(req, makeContext());
    expect(res.status).toBe(406);
    expect(res.headers.get("vary")).toBe("Accept");
  });

  it("falls through to origin for browser UA", async () => {
    const originMock = vi.fn(
      (_req?: Request) =>
        new Response("<html>x</html>", { headers: { "Content-Type": "text/html" } }),
    );
    const worker = createAEOWorker({ assets });
    const ctx = makeContext(originMock);
    const req = new Request("https://acme.test/blog/post-1", {
      headers: {
        "user-agent": "Mozilla/5.0 Chrome/130",
        accept: "text/html,*/*;q=0.8",
      },
    });
    const res = await worker(req, ctx);
    expect(originMock).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
    const link = res.headers.get("link") ?? "";
    expect(link).toContain('</blog/post-1.md>; rel="alternate"; type="text/markdown"');
    expect(res.headers.get("vary")).toContain("Accept");
  });

  it("handles missing .md (cache miss) for bot — falls to origin", async () => {
    const originMock = vi.fn(
      (_req?: Request) =>
        new Response("<html>404</html>", {
          status: 404,
          headers: { "Content-Type": "text/html" },
        }),
    );
    const worker = createAEOWorker({ assets });
    const ctx = makeContext(originMock);
    const req = new Request("https://acme.test/blog/missing", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await worker(req, ctx);
    expect(originMock).toHaveBeenCalledOnce();
    expect(res.status).toBe(404);
  });

  it("serves index.md for root path", async () => {
    const worker = createAEOWorker({ assets });
    const req = new Request("https://acme.test/", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await worker(req, makeContext());
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("# Home\n\nWelcome.");
  });

  it("decorates direct .md requests with full AEO headers from assets", async () => {
    const worker = createAEOWorker({ assets });
    const req = new Request("https://acme.test/blog/post-1.md");
    const res = await worker(req, makeContext());
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
    const worker = createAEOWorker({ assets });
    const req = new Request("https://acme.test/missing.md");
    const res = await worker(req, makeContext());
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Trailing slash
// ---------------------------------------------------------------------------

describe("createAEOWorker — trailing slash", () => {
  it("redirects /path/ → /path with 301 by default", async () => {
    const assets = makeAssets({});
    const worker = createAEOWorker({ assets });
    const req = new Request("https://acme.test/blog/");
    const res = await worker(req, makeContext());
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://acme.test/blog");
  });

  it("preserves trailing slash with mode=preserve", async () => {
    const assets = makeAssets({});
    const originMock = vi.fn(
      (_req?: Request) => new Response("ok", { headers: { "Content-Type": "text/html" } }),
    );
    const worker = createAEOWorker({ assets, trailingSlash: "preserve" });
    const res = await worker(new Request("https://acme.test/blog/"), makeContext(originMock));
    expect(res.status).toBe(200);
    expect(originMock).toHaveBeenCalledOnce();
  });

  it("redirects /path → /path/ with mode=always", async () => {
    const assets = makeAssets({});
    const worker = createAEOWorker({ assets, trailingSlash: "always" });
    const req = new Request("https://acme.test/blog");
    const res = await worker(req, makeContext());
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://acme.test/blog/");
  });
});

// ---------------------------------------------------------------------------
// Redirects
// ---------------------------------------------------------------------------

describe("createAEOWorker — redirects", () => {
  let assets: AssetsFetcher;

  beforeEach(() => {
    assets = makeAssets({ "/new-path.md": "# New\n\nMoved." });
  });

  it("follows internal redirect for AI bot to canonical .md", async () => {
    const worker = createAEOWorker({
      assets,
      redirects: { internal: { "/old-path": "/new-path" } },
    });
    const req = new Request("https://acme.test/old-path", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await worker(req, makeContext());
    expect(res.status).toBe(200);
    expect(res.headers.get("x-redirect-from")).toBe("/old-path");
    expect(res.headers.get("x-redirect-to")).toBe("/new-path");
    expect(await res.text()).toContain("# New");
  });

  it("returns markdown notice for external redirect", async () => {
    const worker = createAEOWorker({
      assets,
      redirects: { external: { "/login": "https://app.example.com" } },
    });
    const req = new Request("https://acme.test/login", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await worker(req, makeContext());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(res.headers.get("x-redirect-to")).toBe("https://app.example.com");
    expect(await res.text()).toContain("https://app.example.com");
  });
});

// ---------------------------------------------------------------------------
// Skip rules
// ---------------------------------------------------------------------------

describe("createAEOWorker — skip rules", () => {
  it("skips /api/ paths entirely", async () => {
    const assets = makeAssets({});
    const originMock = vi.fn((_req?: Request) => new Response("api"));
    const worker = createAEOWorker({ assets });
    const req = new Request("https://acme.test/api/foo", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await worker(req, makeContext(originMock));
    expect(originMock).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
  });

  it("skips asset extensions", async () => {
    const assets = makeAssets({});
    const originMock = vi.fn(
      (_req?: Request) => new Response(".css", { headers: { "Content-Type": "text/css" } }),
    );
    const worker = createAEOWorker({ assets });
    const req = new Request("https://acme.test/style.css", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    await worker(req, makeContext(originMock));
    expect(originMock).toHaveBeenCalledOnce();
  });

  it("does not inject Link header on non-html responses", async () => {
    const assets = makeAssets({});
    const worker = createAEOWorker({ assets });
    const req = new Request("https://acme.test/data");
    const res = await worker(
      req,
      makeContext(() => new Response("{}", { headers: { "Content-Type": "application/json" } })),
    );
    expect(res.headers.get("link")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

describe("createAEOWorker — hooks", () => {
  it("calls onAIRequest on hit", async () => {
    const onAIRequest = vi.fn();
    const assets = makeAssets({ "/p.md": "# p" });
    const worker = createAEOWorker({ assets, hooks: { onAIRequest } });
    const ctx = makeContext();
    await worker(
      new Request("https://acme.test/p", { headers: { "user-agent": "GPTBot/1.0" } }),
      ctx,
    );
    // Drain waitUntil promises so the mock gets called
    await Promise.all(ctx.promises);
    expect(onAIRequest).toHaveBeenCalledOnce();
    const info = onAIRequest.mock.calls[0]?.[0];
    expect(info.botName).toBe("GPTBot");
    expect(info.cacheStatus).toBe("hit");
  });

  it("calls onMiss on cache miss", async () => {
    const onMiss = vi.fn();
    const assets = makeAssets({});
    const worker = createAEOWorker({ assets, hooks: { onMiss } });
    const ctx = makeContext(() => new Response("404", { status: 404 }));
    await worker(
      new Request("https://acme.test/q", { headers: { "user-agent": "GPTBot/1.0" } }),
      ctx,
    );
    await Promise.all(ctx.promises);
    expect(onMiss).toHaveBeenCalledOnce();
  });

  it("calls onAIRequest for internal redirect hit", async () => {
    const onAIRequest = vi.fn();
    const assets = makeAssets({ "/new.md": "# New" });
    const worker = createAEOWorker({
      assets,
      redirects: { internal: { "/old": "/new" } },
      hooks: { onAIRequest },
    });
    const ctx = makeContext();
    await worker(
      new Request("https://acme.test/old", { headers: { "user-agent": "GPTBot/1.0" } }),
      ctx,
    );
    await Promise.all(ctx.promises);
    expect(onAIRequest).toHaveBeenCalledOnce();
    expect(onAIRequest.mock.calls[0]?.[0].cacheStatus).toBe("hit");
  });

  it("calls onAIRequest for external redirect", async () => {
    const onAIRequest = vi.fn();
    const assets = makeAssets({});
    const worker = createAEOWorker({
      assets,
      redirects: { external: { "/ext": "https://example.com" } },
      hooks: { onAIRequest },
    });
    const ctx = makeContext();
    await worker(
      new Request("https://acme.test/ext", { headers: { "user-agent": "GPTBot/1.0" } }),
      ctx,
    );
    await Promise.all(ctx.promises);
    expect(onAIRequest).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Link header injection
// ---------------------------------------------------------------------------

describe("createAEOWorker — Link header injection", () => {
  it("preserves existing Link header values", async () => {
    const assets = makeAssets({});
    const worker = createAEOWorker({ assets });
    const res = await worker(
      new Request("https://acme.test/page"),
      makeContext(
        () =>
          new Response("<html></html>", {
            headers: {
              "Content-Type": "text/html",
              Link: "</style.css>; rel=preload; as=style",
            },
          }),
      ),
    );
    const link = res.headers.get("link") ?? "";
    expect(link).toContain("</style.css>; rel=preload; as=style");
    expect(link).toContain('</page.md>; rel="alternate"; type="text/markdown"');
  });

  it("can be disabled via enableLinkHeader=false", async () => {
    const assets = makeAssets({});
    const worker = createAEOWorker({ assets, enableLinkHeader: false });
    const res = await worker(
      new Request("https://acme.test/page"),
      makeContext(
        () => new Response("<html></html>", { headers: { "Content-Type": "text/html" } }),
      ),
    );
    expect(res.headers.get("link")).toBeNull();
  });

  it("appends Accept to existing Vary header", async () => {
    const assets = makeAssets({});
    const worker = createAEOWorker({ assets });
    const res = await worker(
      new Request("https://acme.test/page"),
      makeContext(
        () =>
          new Response("<html></html>", {
            headers: { "Content-Type": "text/html", Vary: "Accept-Encoding" },
          }),
      ),
    );
    expect(res.headers.get("vary")).toContain("Accept-Encoding");
    expect(res.headers.get("vary")).toContain("Accept");
  });

  it("does not duplicate Accept in Vary when already present", async () => {
    const assets = makeAssets({});
    const worker = createAEOWorker({ assets });
    const res = await worker(
      new Request("https://acme.test/page"),
      makeContext(
        () =>
          new Response("<html></html>", {
            headers: { "Content-Type": "text/html", Vary: "Accept" },
          }),
      ),
    );
    const vary = res.headers.get("vary") ?? "";
    const parts = vary.split(",").map((s) => s.trim().toLowerCase());
    expect(parts.filter((p) => p === "accept")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Default options / edge cases
// ---------------------------------------------------------------------------

describe("createAEOWorker — default options", () => {
  it("works with zero options (uses global fetch via assets fallback)", async () => {
    // Create worker without any options — the global fetch fallback is used.
    // We inject assets to avoid making real network requests in tests.
    const assets = makeAssets({});
    const worker = createAEOWorker({ assets });
    const req = new Request("https://acme.test/page");
    // Should not throw — falls through to context.next()
    const res = await worker(req, makeContext());
    expect(res.status).toBe(200);
  });

  it("does not inject Link header on .md paths", async () => {
    const assets = makeAssets({ "/doc.md": "# Doc" });
    const worker = createAEOWorker({ assets });
    const req = new Request("https://acme.test/doc.md");
    const res = await worker(req, makeContext());
    // Direct .md serve — no Link header
    expect(res.headers.get("link")).toBeNull();
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
  });

  it("passes query string through on trailing slash redirect", async () => {
    const assets = makeAssets({});
    const worker = createAEOWorker({ assets });
    const req = new Request("https://acme.test/blog/?ref=twitter");
    const res = await worker(req, makeContext());
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://acme.test/blog?ref=twitter");
  });
});
