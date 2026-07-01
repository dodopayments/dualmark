import { describe, it, expect, beforeEach, vi } from "vitest";
import { createAEOWorker } from "../src/index.js";
import type {
  AnalyticsEngineDataset,
  AnalyticsEngineWriteOptions,
  AssetsBinding,
  MinimalEnv,
  MinimalExecutionContext,
  UpstreamWorker,
} from "../src/types.js";

interface TestEnv extends MinimalEnv {
  ASSETS: AssetsBinding;
  ANALYTICS?: AnalyticsEngineDataset;
}

function makeAssets(files: Record<string, string>): AssetsBinding {
  return {
    fetch: async (req) => {
      const url = req instanceof Request ? new URL(req.url) : new URL(String(req));
      const body = files[url.pathname];
      if (body === undefined) return new Response("Not found", { status: 404 });
      return new Response(body, { status: 200 });
    },
  };
}

function makeUpstream(handler: (req: Request) => Response | Promise<Response>): UpstreamWorker<TestEnv> {
  return {
    fetch: async (req) => handler(req),
  };
}

function makeCtx(): MinimalExecutionContext {
  const promises: Promise<unknown>[] = [];
  return {
    waitUntil: (p) => {
      promises.push(p);
    },
  };
}

function makeAnalytics(): {
  ds: AnalyticsEngineDataset;
  writes: AnalyticsEngineWriteOptions[];
} {
  const writes: AnalyticsEngineWriteOptions[] = [];
  return {
    writes,
    ds: {
      writeDataPoint: (e) => {
        writes.push(e);
      },
    },
  };
}

describe("createAEOWorker — markdown serving", () => {
  let env: TestEnv;
  beforeEach(() => {
    env = {
      ASSETS: makeAssets({
        "/blog/post-1.md": "# Post 1\n\nBody.",
        "/index.md": "# Home\n\nWelcome.",
      }),
    };
  });

  it("serves markdown to AI bot UA on existing path", async () => {
    const worker = createAEOWorker({
      upstream: makeUpstream(() => new Response("html", { headers: { "Content-Type": "text/html" } })),
    });
    const req = new Request("https://acme.test/blog/post-1", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await worker.fetch(req, env, makeCtx());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(res.headers.get("x-markdown-tokens")).toBe("4");
    expect(res.headers.get("x-aeo-version")).toBe("1.0");
    expect(res.headers.get("vary")).toBe("Accept");
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
    expect(await res.text()).toBe("# Post 1\n\nBody.");
  });

  it("serves markdown when Accept: text/markdown (no bot UA)", async () => {
    const worker = createAEOWorker({
      upstream: makeUpstream(() => new Response("html", { headers: { "Content-Type": "text/html" } })),
    });
    const req = new Request("https://acme.test/blog/post-1", {
      headers: { accept: "text/markdown" },
    });
    const res = await worker.fetch(req, env, makeCtx());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
  });

  it("returns 406 when Accept rules out html and markdown", async () => {
    const worker = createAEOWorker({
      upstream: makeUpstream(() => new Response("html", { headers: { "Content-Type": "text/html" } })),
    });
    const req = new Request("https://acme.test/blog/post-1", {
      headers: { accept: "image/png" },
    });
    const res = await worker.fetch(req, env, makeCtx());
    expect(res.status).toBe(406);
    expect(res.headers.get("vary")).toBe("Accept");
  });

  it("falls through to upstream for browser UA", async () => {
    const upstreamMock = vi.fn(
      (_req: Request) =>
        new Response("<html>x</html>", { headers: { "Content-Type": "text/html" } }),
    );
    const worker = createAEOWorker({
      upstream: { fetch: async (req) => upstreamMock(req) },
    });
    const req = new Request("https://acme.test/blog/post-1", {
      headers: {
        "user-agent": "Mozilla/5.0 Chrome/130",
        accept: "text/html,*/*;q=0.8",
      },
    });
    const res = await worker.fetch(req, env, makeCtx());
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
    const worker = createAEOWorker({
      upstream: { fetch: async (req) => upstreamMock(req) },
    });
    const req = new Request("https://acme.test/blog/missing", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await worker.fetch(req, env, makeCtx());
    expect(upstreamMock).toHaveBeenCalledOnce();
    expect(res.status).toBe(404);
  });

  it("serves index.md for root path", async () => {
    const worker = createAEOWorker({
      upstream: makeUpstream(() => new Response("html")),
    });
    const req = new Request("https://acme.test/", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await worker.fetch(req, env, makeCtx());
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("# Home\n\nWelcome.");
  });

  it("decorates direct .md requests with full AEO headers from ASSETS", async () => {
    const worker = createAEOWorker({
      upstream: makeUpstream(() => new Response("should-not-be-called", { status: 500 })),
    });
    const req = new Request("https://acme.test/blog/post-1.md");
    const res = await worker.fetch(req, env, makeCtx());
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
    const worker = createAEOWorker({
      upstream: makeUpstream(() => new Response("html")),
    });
    const req = new Request("https://acme.test/missing.md");
    const res = await worker.fetch(req, env, makeCtx());
    expect(res.status).toBe(404);
  });
});

describe("createAEOWorker — trailing slash", () => {
  it("redirects /path/ → /path with 301 by default", async () => {
    const worker = createAEOWorker({ upstream: makeUpstream(() => new Response("ok")) });
    const env: TestEnv = { ASSETS: makeAssets({}) };
    const req = new Request("https://acme.test/blog/");
    const res = await worker.fetch(req, env, makeCtx());
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://acme.test/blog");
  });

  it("preserves trailing slash with mode=preserve", async () => {
    const upstream = vi.fn(
      (_req: Request) => new Response("ok", { headers: { "Content-Type": "text/html" } }),
    );
    const worker = createAEOWorker({
      upstream: { fetch: async (req) => upstream(req) },
      trailingSlash: "preserve",
    });
    const env: TestEnv = { ASSETS: makeAssets({}) };
    const req = new Request("https://acme.test/blog/");
    const res = await worker.fetch(req, env, makeCtx());
    expect(res.status).toBe(200);
    expect(upstream).toHaveBeenCalledOnce();
  });

  it("redirects /path → /path/ with mode=always", async () => {
    const worker = createAEOWorker({
      upstream: makeUpstream(() => new Response("ok")),
      trailingSlash: "always",
    });
    const env: TestEnv = { ASSETS: makeAssets({}) };
    const req = new Request("https://acme.test/blog");
    const res = await worker.fetch(req, env, makeCtx());
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://acme.test/blog/");
  });
});

describe("createAEOWorker — redirects", () => {
  let env: TestEnv;
  beforeEach(() => {
    env = {
      ASSETS: makeAssets({ "/new-path.md": "# New\n\nMoved." }),
    };
  });

  it("follows internal redirect for AI bot to canonical .md", async () => {
    const worker = createAEOWorker({
      upstream: makeUpstream(() => new Response("html")),
      redirects: { internal: { "/old-path": "/new-path" } },
    });
    const req = new Request("https://acme.test/old-path", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await worker.fetch(req, env, makeCtx());
    expect(res.status).toBe(200);
    expect(res.headers.get("x-redirect-from")).toBe("/old-path");
    expect(res.headers.get("x-redirect-to")).toBe("/new-path");
    expect(await res.text()).toContain("# New");
  });

  it("returns markdown notice for external redirect", async () => {
    const worker = createAEOWorker({
      upstream: makeUpstream(() => new Response("html")),
      redirects: { external: { "/login": "https://app.example.com" } },
    });
    const req = new Request("https://acme.test/login", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await worker.fetch(req, env, makeCtx());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(res.headers.get("x-redirect-to")).toBe("https://app.example.com");
    expect(await res.text()).toContain("https://app.example.com");
  });
});

describe("createAEOWorker — skip rules", () => {
  it("skips /api/ paths entirely", async () => {
    const upstream = vi.fn((_req: Request) => new Response("api"));
    const worker = createAEOWorker({
      upstream: { fetch: async (req) => upstream(req) },
    });
    const env: TestEnv = { ASSETS: makeAssets({}) };
    const req = new Request("https://acme.test/api/foo", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await worker.fetch(req, env, makeCtx());
    expect(upstream).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
  });

  it("skips asset extensions", async () => {
    const upstream = vi.fn(
      (_req: Request) => new Response(".css", { headers: { "Content-Type": "text/css" } }),
    );
    const worker = createAEOWorker({
      upstream: { fetch: async (req) => upstream(req) },
    });
    const env: TestEnv = { ASSETS: makeAssets({}) };
    const req = new Request("https://acme.test/style.css", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    await worker.fetch(req, env, makeCtx());
    expect(upstream).toHaveBeenCalledOnce();
  });

  it("does not inject Link header on non-html responses", async () => {
    const worker = createAEOWorker({
      upstream: makeUpstream(
        () => new Response("{}", { headers: { "Content-Type": "application/json" } }),
      ),
    });
    const env: TestEnv = { ASSETS: makeAssets({}) };
    const req = new Request("https://acme.test/data");
    const res = await worker.fetch(req, env, makeCtx());
    expect(res.headers.get("link")).toBeNull();
  });
});

describe("createAEOWorker — analytics", () => {
  it("writes data point on hit when binding present", async () => {
    const { ds, writes } = makeAnalytics();
    const env: TestEnv = {
      ASSETS: makeAssets({ "/x.md": "# X" }),
      ANALYTICS: ds,
    };
    const worker = createAEOWorker({
      upstream: makeUpstream(() => new Response("html")),
      analytics: { binding: "ANALYTICS" },
    });
    await worker.fetch(
      new Request("https://acme.test/x", { headers: { "user-agent": "GPTBot/1.0" } }),
      env,
      makeCtx(),
    );
    expect(writes).toHaveLength(1);
    const w = writes[0];
    expect(w?.indexes).toEqual(["GPTBot"]);
    expect(w?.blobs?.[0]).toBe("GPTBot");
    expect(w?.blobs?.[1]).toBe("/x");
    expect(w?.blobs?.[3]).toBe("hit");
    expect(w?.doubles?.[0]).toBeGreaterThan(0);
  });

  it("writes miss when no .md and no redirect", async () => {
    const { ds, writes } = makeAnalytics();
    const env: TestEnv = {
      ASSETS: makeAssets({}),
      ANALYTICS: ds,
    };
    const worker = createAEOWorker({
      upstream: makeUpstream(() => new Response("404", { status: 404 })),
      analytics: { binding: "ANALYTICS" },
    });
    await worker.fetch(
      new Request("https://acme.test/missing", { headers: { "user-agent": "GPTBot/1.0" } }),
      env,
      makeCtx(),
    );
    expect(writes).toHaveLength(1);
    expect(writes[0]?.blobs?.[3]).toBe("miss");
  });

  it("does not throw when binding absent", async () => {
    const env: TestEnv = { ASSETS: makeAssets({ "/x.md": "# X" }) };
    const worker = createAEOWorker({
      upstream: makeUpstream(() => new Response("html")),
      analytics: { binding: "MISSING_BINDING" },
    });
    const res = await worker.fetch(
      new Request("https://acme.test/x", { headers: { "user-agent": "GPTBot/1.0" } }),
      env,
      makeCtx(),
    );
    expect(res.status).toBe(200);
  });
});

describe("createAEOWorker — hooks", () => {
  it("calls onAIRequest on hit", async () => {
    const onAIRequest = vi.fn();
    const env: TestEnv = { ASSETS: makeAssets({ "/p.md": "# p" }) };
    const worker = createAEOWorker({
      upstream: makeUpstream(() => new Response("html")),
      hooks: { onAIRequest },
    });
    await worker.fetch(
      new Request("https://acme.test/p", { headers: { "user-agent": "GPTBot/1.0" } }),
      env,
      makeCtx(),
    );
    expect(onAIRequest).toHaveBeenCalledOnce();
    const info = onAIRequest.mock.calls[0]?.[0];
    expect(info.botName).toBe("GPTBot");
    expect(info.cacheStatus).toBe("hit");
  });

  it("calls onMiss on cache miss", async () => {
    const onMiss = vi.fn();
    const env: TestEnv = { ASSETS: makeAssets({}) };
    const worker = createAEOWorker({
      upstream: makeUpstream(() => new Response("404", { status: 404 })),
      hooks: { onMiss },
    });
    await worker.fetch(
      new Request("https://acme.test/q", { headers: { "user-agent": "GPTBot/1.0" } }),
      env,
      makeCtx(),
    );
    expect(onMiss).toHaveBeenCalledOnce();
  });
});

describe("createAEOWorker — Link header injection", () => {
  it("preserves existing Link header values", async () => {
    const env: TestEnv = { ASSETS: makeAssets({}) };
    const worker = createAEOWorker({
      upstream: makeUpstream(
        () =>
          new Response("<html></html>", {
            headers: {
              "Content-Type": "text/html",
              Link: '</style.css>; rel=preload; as=style',
            },
          }),
      ),
    });
    const res = await worker.fetch(new Request("https://acme.test/page"), env, makeCtx());
    const link = res.headers.get("link") ?? "";
    expect(link).toContain("</style.css>; rel=preload; as=style");
    expect(link).toContain('</page.md>; rel="alternate"; type="text/markdown"');
  });

  it("can be disabled via enableLinkHeader=false", async () => {
    const env: TestEnv = { ASSETS: makeAssets({}) };
    const worker = createAEOWorker({
      upstream: makeUpstream(
        () => new Response("<html></html>", { headers: { "Content-Type": "text/html" } }),
      ),
      enableLinkHeader: false,
    });
    const res = await worker.fetch(new Request("https://acme.test/page"), env, makeCtx());
    expect(res.headers.get("link")).toBeNull();
  });

  it("sets Vary: Accept on HTML even when the Link header is disabled", async () => {
    const env: TestEnv = { ASSETS: makeAssets({}) };
    const worker = createAEOWorker({
      upstream: makeUpstream(
        () => new Response("<html></html>", { headers: { "Content-Type": "text/html" } }),
      ),
      enableLinkHeader: false,
    });
    const req = new Request("https://acme.test/page", {
      headers: {
        "user-agent": "Mozilla/5.0 Chrome/130",
        accept: "text/html,*/*;q=0.8",
      },
    });
    const res = await worker.fetch(req, env, makeCtx());
    expect((res.headers.get("vary") ?? "").toLowerCase()).toContain("accept");
    expect(res.headers.get("link")).toBeNull();
  });
});
