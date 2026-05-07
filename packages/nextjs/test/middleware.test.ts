import { describe, it, expect } from "vitest";
import {
  buildMatcherSource,
  handleRequest,
  toInternalMarkdownPath,
} from "../src/middleware.js";
import { resolveConfig } from "../src/config-validation.js";

interface FakeNextRequest {
  headers: Headers;
  nextUrl: URL & { clone: () => URL };
  url: string;
}

function makeReq(url: string, headers: Record<string, string> = {}): FakeNextRequest {
  const u = new URL(url);
  const cloneable = Object.assign(new URL(u.toString()), {
    clone: () => Object.assign(new URL(u.toString()), { clone: cloneable.clone }),
  });
  return {
    headers: new Headers(headers),
    nextUrl: cloneable,
    url,
  };
}

const FakeNextResponse = {
  next() {
    return new Response(null, { status: 200, headers: { "x-middleware-next": "1" } });
  },
  rewrite(url: URL) {
    return new Response(null, {
      status: 200,
      headers: { "x-middleware-rewrite": url.toString() },
    });
  },
  redirect(url: URL, status?: number) {
    return new Response(null, {
      status: status ?? 307,
      headers: { Location: url.toString() },
    });
  },
  json(body: unknown, init?: ResponseInit) {
    return new Response(JSON.stringify(body), init);
  },
};

describe("buildMatcherSource", () => {
  it("excludes _next, favicon, and the internal namespace", () => {
    expect(buildMatcherSource("md")).toBe("/((?!_next/|favicon.ico|md/).*)");
    expect(buildMatcherSource("_internal")).toBe("/((?!_next/|favicon.ico|_internal/).*)");
  });
});

describe("toInternalMarkdownPath", () => {
  it("maps root", () => {
    expect(toInternalMarkdownPath("/", "md")).toBe("/md/index");
    expect(toInternalMarkdownPath("", "md")).toBe("/md/index");
  });
  it("strips .md and trailing slash", () => {
    expect(toInternalMarkdownPath("/blog/post", "md")).toBe("/md/blog/post");
    expect(toInternalMarkdownPath("/blog/post.md", "md")).toBe("/md/blog/post");
    expect(toInternalMarkdownPath("/blog/", "md")).toBe("/md/blog");
  });
  it("respects custom namespace", () => {
    expect(toInternalMarkdownPath("/blog/post", "_md")).toBe("/_md/blog/post");
  });
});

describe("handleRequest — bot/Accept negotiation", () => {
  const resolved = resolveConfig({ siteUrl: "https://example.com" });

  it("rewrites to /md/<path> for AI bot UA", () => {
    const req = makeReq("https://example.com/blog/hello", { "user-agent": "GPTBot/1.0" });
    const res = handleRequest(req, FakeNextResponse, resolved);
    expect(res.headers.get("x-middleware-rewrite")).toBe("https://example.com/md/blog/hello");
  });

  it("rewrites to /md/<path> for Accept: text/markdown", () => {
    const req = makeReq("https://example.com/blog/hello", { accept: "text/markdown" });
    const res = handleRequest(req, FakeNextResponse, resolved);
    expect(res.headers.get("x-middleware-rewrite")).toBe("https://example.com/md/blog/hello");
  });

  it("rewrites to /md/index for root", () => {
    const req = makeReq("https://example.com/", { "user-agent": "ClaudeBot/1.0" });
    const res = handleRequest(req, FakeNextResponse, resolved);
    expect(res.headers.get("x-middleware-rewrite")).toBe("https://example.com/md/index");
  });

  it("rewrites direct .md URL to /md/<path>", () => {
    const req = makeReq("https://example.com/blog/hello.md");
    const res = handleRequest(req, FakeNextResponse, resolved);
    expect(res.headers.get("x-middleware-rewrite")).toBe("https://example.com/md/blog/hello");
  });

  it("returns 406 when Accept rules out html and markdown", () => {
    const req = makeReq("https://example.com/blog/hello", { accept: "image/png" });
    const res = handleRequest(req, FakeNextResponse, resolved);
    expect(res.status).toBe(406);
    expect(res.headers.get("vary")).toBe("Accept");
  });

  it("falls through to next() with Link rel=alternate for HTML browser request", () => {
    const req = makeReq("https://example.com/blog/hello", {
      "user-agent": "Mozilla/5.0 Chrome/130",
      accept: "text/html,*/*;q=0.8",
    });
    const res = handleRequest(req, FakeNextResponse, resolved);
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(res.headers.get("link")).toContain('</blog/hello.md>; rel="alternate"; type="text/markdown"');
    expect(res.headers.get("vary")).toContain("Accept");
  });

  it("does not inject Link header when injectLinkHeader=false", () => {
    const r = resolveConfig({
      siteUrl: "https://example.com",
      middleware: { injectLinkHeader: false },
    });
    const req = makeReq("https://example.com/blog/hello", {
      "user-agent": "Mozilla/5.0",
      accept: "text/html",
    });
    const res = handleRequest(req, FakeNextResponse, r);
    expect(res.headers.get("link")).toBeNull();
  });
});

describe("handleRequest — skip rules", () => {
  const resolved = resolveConfig({ siteUrl: "https://example.com" });

  it("skips /llms.txt", () => {
    const req = makeReq("https://example.com/llms.txt", { "user-agent": "GPTBot/1.0" });
    const res = handleRequest(req, FakeNextResponse, resolved);
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("skips internal namespace paths", () => {
    const req = makeReq("https://example.com/md/blog/hello", { "user-agent": "GPTBot/1.0" });
    const res = handleRequest(req, FakeNextResponse, resolved);
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("skips _next/", () => {
    const req = makeReq("https://example.com/_next/static/foo.js", {
      "user-agent": "GPTBot/1.0",
    });
    const res = handleRequest(req, FakeNextResponse, resolved);
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("skips user-defined skipPaths exactly and as prefix", () => {
    const r = resolveConfig({
      siteUrl: "https://example.com",
      middleware: { skipPaths: ["/admin"] },
    });
    const exact = handleRequest(
      makeReq("https://example.com/admin", { "user-agent": "GPTBot/1.0" }),
      FakeNextResponse,
      r,
    );
    expect(exact.headers.get("x-middleware-next")).toBe("1");
    const nested = handleRequest(
      makeReq("https://example.com/admin/users", { "user-agent": "GPTBot/1.0" }),
      FakeNextResponse,
      r,
    );
    expect(nested.headers.get("x-middleware-next")).toBe("1");
  });
});

describe("handleRequest — custom internal namespace", () => {
  it("respects custom internalNamespace in rewrites and skip rules", () => {
    const r = resolveConfig({ siteUrl: "https://example.com", internalNamespace: "_md" });
    const rewriteRes = handleRequest(
      makeReq("https://example.com/blog/hello", { "user-agent": "GPTBot/1.0" }),
      FakeNextResponse,
      r,
    );
    expect(rewriteRes.headers.get("x-middleware-rewrite")).toBe(
      "https://example.com/_md/blog/hello",
    );

    const skipRes = handleRequest(
      makeReq("https://example.com/_md/blog/hello", { "user-agent": "GPTBot/1.0" }),
      FakeNextResponse,
      r,
    );
    expect(skipRes.headers.get("x-middleware-next")).toBe("1");
  });
});
