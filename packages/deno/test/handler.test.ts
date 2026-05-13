import { describe, it, expect, vi } from "vitest";
import { createAEOHandler } from "../src/index.js";
import type { DenoServeHandlerInfo, DenoUpstreamHandler } from "../src/types.js";

function makeInfo(): DenoServeHandlerInfo {
  return {
    remoteAddr: { transport: "tcp", hostname: "127.0.0.1", port: 8000 },
    completed: Promise.resolve(),
  };
}

function makeUpstream(files: Record<string, { body: string; contentType: string; status?: number }>): DenoUpstreamHandler {
  return async (req: Request) => {
    const url = new URL(req.url);
    const file = files[url.pathname];
    if (!file) {
      return new Response("Not Found", { status: 404, headers: { "Content-Type": "text/plain" } });
    }
    return new Response(file.body, {
      status: file.status ?? 200,
      headers: { "Content-Type": file.contentType },
    });
  };
}

describe("createAEOHandler — markdown serving", () => {
  const files = {
    "/blog/post-1.md": { body: "# Post 1\n\nBody.", contentType: "text/markdown" },
    "/index.md": { body: "# Home\n\nWelcome.", contentType: "text/markdown" },
    "/blog/post-1": { body: "<html>Post 1</html>", contentType: "text/html" },
    "/": { body: "<html>Home</html>", contentType: "text/html" },
  };

  it("serves markdown to AI bot UA on existing path", async () => {
    const handler = createAEOHandler({
      upstream: makeUpstream(files),
    });
    const req = new Request("https://acme.test/blog/post-1", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await handler(req, makeInfo());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(res.headers.get("x-markdown-tokens")).toBe("4");
    expect(res.headers.get("x-aeo-version")).toBe("1.0");
    expect(res.headers.get("vary")).toBe("Accept");
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
    expect(await res.text()).toBe("# Post 1\n\nBody.");
  });

  it("serves markdown when Accept: text/markdown (no bot UA)", async () => {
    const handler = createAEOHandler({
      upstream: makeUpstream(files),
    });
    const req = new Request("https://acme.test/blog/post-1", {
      headers: { accept: "text/markdown" },
    });
    const res = await handler(req, makeInfo());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
  });

  it("returns 406 when Accept rules out html and markdown", async () => {
    const handler = createAEOHandler({
      upstream: makeUpstream(files),
    });
    const req = new Request("https://acme.test/blog/post-1", {
      headers: { accept: "image/png" },
    });
    const res = await handler(req, makeInfo());
    expect(res.status).toBe(406);
    expect(res.headers.get("vary")).toBe("Accept");
  });

  it("falls through to upstream for browser UA", async () => {
    const upstream = makeUpstream(files);
    const handler = createAEOHandler({ upstream });
    const req = new Request("https://acme.test/blog/post-1", {
      headers: {
        "user-agent": "Mozilla/5.0 Chrome/130",
        accept: "text/html,*/*;q=0.8",
      },
    });
    const res = await handler(req, makeInfo());
    expect(res.status).toBe(200);
    const link = res.headers.get("link") ?? "";
    expect(link).toContain('</blog/post-1.md>; rel="alternate"; type="text/markdown"');
    expect(res.headers.get("vary")).toContain("Accept");
  });

  it("handles missing .md (cache miss) for bot — falls to upstream", async () => {
    const handler = createAEOHandler({
      upstream: makeUpstream({
        "/blog/missing": { body: "<html>404</html>", contentType: "text/html", status: 404 },
      }),
    });
    const req = new Request("https://acme.test/blog/missing", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await handler(req, makeInfo());
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("<html>404</html>");
  });

  it("serves index.md for root path", async () => {
    const handler = createAEOHandler({
      upstream: makeUpstream(files),
    });
    const req = new Request("https://acme.test/", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await handler(req, makeInfo());
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("# Home\n\nWelcome.");
  });

  it("decorates direct .md requests with full AEO headers", async () => {
    const handler = createAEOHandler({
      upstream: makeUpstream(files),
    });
    const req = new Request("https://acme.test/blog/post-1.md");
    const res = await handler(req, makeInfo());
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
    expect(res.headers.get("X-Markdown-Tokens")).toMatch(/^\d+$/);
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex");
    expect(res.headers.get("Vary")).toBe("Accept");
    expect(res.headers.get("X-AEO-Version")).toBe("1.0");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(await res.text()).toBe("# Post 1\n\nBody.");
  });
});

describe("createAEOHandler — trailing slash", () => {
  it("redirects /path/ → /path with 301 by default", async () => {
    const handler = createAEOHandler({ upstream: makeUpstream({}) });
    const req = new Request("https://acme.test/blog/");
    const res = await handler(req, makeInfo());
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://acme.test/blog");
  });

  it("preserves trailing slash with mode=preserve", async () => {
    const handler = createAEOHandler({
      upstream: makeUpstream({ "/blog/": { body: "ok", contentType: "text/html" } }),
      trailingSlash: "preserve",
    });
    const req = new Request("https://acme.test/blog/");
    const res = await handler(req, makeInfo());
    expect(res.status).toBe(200);
  });

  it("redirects /path → /path/ with mode=always", async () => {
    const handler = createAEOHandler({
      upstream: makeUpstream({}),
      trailingSlash: "always",
    });
    const req = new Request("https://acme.test/blog");
    const res = await handler(req, makeInfo());
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://acme.test/blog/");
  });
});

describe("createAEOHandler — redirects", () => {
  const files = {
    "/new-path.md": { body: "# New\n\nMoved.", contentType: "text/markdown" },
  };

  it("follows internal redirect for AI bot to canonical .md", async () => {
    const handler = createAEOHandler({
      upstream: makeUpstream(files),
      redirects: { internal: { "/old-path": "/new-path" } },
    });
    const req = new Request("https://acme.test/old-path", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await handler(req, makeInfo());
    expect(res.status).toBe(200);
    expect(res.headers.get("x-redirect-from")).toBe("/old-path");
    expect(res.headers.get("x-redirect-to")).toBe("/new-path");
    expect(await res.text()).toContain("# New");
  });

  it("returns markdown notice for external redirect", async () => {
    const handler = createAEOHandler({
      upstream: makeUpstream({}),
      redirects: { external: { "/login": "https://app.example.com" } },
    });
    const req = new Request("https://acme.test/login", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await handler(req, makeInfo());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(res.headers.get("x-redirect-to")).toBe("https://app.example.com");
    expect(await res.text()).toContain("https://app.example.com");
  });
});

describe("createAEOHandler — skip rules", () => {
  it("skips /api/ paths entirely", async () => {
    const upstream = vi.fn(async () => new Response("api"));
    const handler = createAEOHandler({ upstream });
    const req = new Request("https://acme.test/api/foo", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    const res = await handler(req, makeInfo());
    expect(upstream).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
  });

  it("skips asset extensions", async () => {
    const upstream = vi.fn(async () => new Response(".css", { headers: { "Content-Type": "text/css" } }));
    const handler = createAEOHandler({ upstream });
    const req = new Request("https://acme.test/style.css", {
      headers: { "user-agent": "GPTBot/1.0" },
    });
    await handler(req, makeInfo());
    expect(upstream).toHaveBeenCalledOnce();
  });
});

describe("createAEOHandler — hooks", () => {
  it("calls onAIRequest on hit", async () => {
    const onAIRequest = vi.fn();
    const handler = createAEOHandler({
      upstream: makeUpstream({ "/p.md": { body: "# p", contentType: "text/markdown" } }),
      hooks: { onAIRequest },
    });
    const info = makeInfo();
    await handler(
      new Request("https://acme.test/p", { headers: { "user-agent": "GPTBot/1.0" } }),
      info,
    );
    
    // Hooks are scheduled on info.completed
    await info.completed;
    // We need to wait a bit more because scheduleHook uses Promise.resolve().then()
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onAIRequest).toHaveBeenCalledOnce();
    const callInfo = onAIRequest.mock.calls[0]?.[0];
    expect(callInfo.botName).toBe("GPTBot");
    expect(callInfo.cacheStatus).toBe("hit");
  });
});

describe("createAEOHandler — Link header injection", () => {
  it("preserves existing Link header values", async () => {
    const upstream: DenoUpstreamHandler = async () =>
      new Response("<html></html>", {
        headers: {
          "Content-Type": "text/html",
          Link: "</style.css>; rel=preload; as=style",
        },
      });
    const handler = createAEOHandler({ upstream });
    const res = await handler(new Request("https://acme.test/page"), makeInfo());
    const link = res.headers.get("link") ?? "";
    expect(link).toContain("</style.css>; rel=preload; as=style");
    expect(link).toContain('</page.md>; rel="alternate"; type="text/markdown"');
  });

  it("can be disabled via enableLinkHeader=false", async () => {
    const upstream: DenoUpstreamHandler = async () =>
      new Response("<html></html>", { headers: { "Content-Type": "text/html" } });
    const handler = createAEOHandler({ upstream, enableLinkHeader: false });
    const res = await handler(new Request("https://acme.test/page"), makeInfo());
    expect(res.headers.get("link")).toBeNull();
  });

  it("does not inject Link header on non-html responses", async () => {
    const upstream: DenoUpstreamHandler = async () =>
      new Response("{}", { headers: { "Content-Type": "application/json" } });
    const handler = createAEOHandler({ upstream });
    const res = await handler(new Request("https://acme.test/data"), makeInfo());
    expect(res.headers.get("link")).toBeNull();
  });
});

describe("createAEOHandler — direct .md handling", () => {
  it("returns 404 for direct .md request when asset missing", async () => {
    const handler = createAEOHandler({ upstream: makeUpstream({}) });
    const res = await handler(new Request("https://acme.test/missing.md"), makeInfo());
    expect(res.status).toBe(404);
  });

  it("passes POST requests through unchanged", async () => {
    const upstream = vi.fn(async () => new Response("ok"));
    const handler = createAEOHandler({ upstream });
    const req = new Request("https://acme.test/blog/post-1", {
      method: "POST",
      headers: { "user-agent": "GPTBot/1.0" },
      body: "test",
    });
    const res = await handler(req, makeInfo());
    expect(upstream).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
  });
});

describe("createAEOHandler — hooks parity", () => {
  it("calls onMiss on cache miss", async () => {
    const onMiss = vi.fn();
    const handler = createAEOHandler({
      upstream: makeUpstream({}),
      hooks: { onMiss },
    });
    const info = makeInfo();
    await handler(
      new Request("https://acme.test/q", { headers: { "user-agent": "GPTBot/1.0" } }),
      info,
    );
    await info.completed;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onMiss).toHaveBeenCalledOnce();
  });
});

describe("createAEOHandler — request body safety", () => {
  it("POST with body does not crash when .md is missing (regression: body-stream consumption)", async () => {
    const handler = createAEOHandler({ upstream: makeUpstream({}) });
    const res = await handler(
      new Request("https://acme.test/submit", {
        method: "POST",
        headers: { "user-agent": "GPTBot/1.0", "content-type": "application/json" },
        body: JSON.stringify({ hello: "world" }),
      }),
      makeInfo(),
    );
    expect(res.status).toBe(404);
  });

  it("passes POST requests through unchanged", async () => {
    const upstream = vi.fn(async () => new Response("ok"));
    const handler = createAEOHandler({ upstream });
    const req = new Request("https://acme.test/blog/post-1", {
      method: "POST",
      headers: { "user-agent": "GPTBot/1.0" },
      body: "test",
    });
    const res = await handler(req, makeInfo());
    expect(upstream).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
  });
});
