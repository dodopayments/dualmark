import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAEORequestHandler } from "../src/index.js";
import type { FastlyFetch } from "../src/types.js";

interface FetchCall {
  pathname: string;
  backend?: string;
}

function makeFetcher(routes: Record<string, string>): { fetcher: FastlyFetch; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fetcher: FastlyFetch = async (request, init) => {
    const url = new URL(request.url);
    calls.push({ pathname: url.pathname, backend: init?.backend });
    const body = routes[url.pathname];
    if (body === undefined) {
      return new Response("Not found", { status: 404 });
    }
    const contentType = url.pathname.endsWith(".md")
      ? "text/markdown; charset=utf-8"
      : "text/html; charset=utf-8";
    return new Response(body, {
      status: 200,
      headers: { "Content-Type": contentType },
    });
  };
  return { fetcher, calls };
}

function makeCustomFetcher(
  handler: (request: Request, init?: RequestInit) => Response | Promise<Response>,
): { fetcher: FastlyFetch; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fetcher: FastlyFetch = async (request, init) => {
    const url = new URL(request.url);
    calls.push({ pathname: url.pathname, backend: init?.backend });
    return handler(request, init);
  };
  return { fetcher, calls };
}

describe("createAEORequestHandler", () => {
  let routes: Record<string, string>;

  beforeEach(() => {
    routes = {
      "/blog/post-1": "<html><body>Post 1</body></html>",
      "/blog/post-1.md": "# Post 1\n\nBody.",
      "/index.md": "# Home\n\nWelcome.",
      "/new-path.md": "# New\n\nMoved.",
      "/style.css": "body{}",
    };
  });

  it("serves markdown to AI bots from the markdown twin path", async () => {
    const { fetcher, calls } = makeFetcher(routes);
    const handle = createAEORequestHandler({
      backend: "origin_0",
      fetcher,
    });

    const response = await handle(
      new Request("https://example.test/blog/post-1", {
        headers: { "user-agent": "GPTBot/1.0" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("# Post 1\n\nBody.");
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(response.headers.get("x-markdown-tokens")).toBe("4");
    expect(calls).toEqual([{ pathname: "/blog/post-1.md", backend: "origin_0" }]);
  });

  it("serves markdown for Accept: text/markdown", async () => {
    const { fetcher } = makeFetcher(routes);
    const handle = createAEORequestHandler({
      backend: "origin_0",
      fetcher,
    });

    const response = await handle(
      new Request("https://example.test/blog/post-1", {
        headers: { accept: "text/markdown" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
  });

  it("returns 406 when Accept excludes both html and markdown", async () => {
    const { fetcher } = makeFetcher(routes);
    const handle = createAEORequestHandler({
      backend: "origin_0",
      fetcher,
    });

    const response = await handle(
      new Request("https://example.test/blog/post-1", {
        headers: { accept: "image/png" },
      }),
    );

    expect(response.status).toBe(406);
    expect(response.headers.get("vary")).toBe("Accept");
  });

  it("falls through to upstream html for browser traffic and injects Link", async () => {
    const { fetcher, calls } = makeFetcher(routes);
    const handle = createAEORequestHandler({
      backend: "origin_0",
      fetcher,
    });

    const response = await handle(
      new Request("https://example.test/blog/post-1", {
        headers: {
          "user-agent": "Mozilla/5.0",
          accept: "text/html,*/*;q=0.8",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("link")).toContain(
      '</blog/post-1.md>; rel="alternate"; type="text/markdown"',
    );
    expect(calls).toEqual([{ pathname: "/blog/post-1", backend: "origin_0" }]);
  });

  it("decorates direct markdown requests", async () => {
    const { fetcher } = makeFetcher(routes);
    const handle = createAEORequestHandler({
      backend: "origin_0",
      fetcher,
    });

    const response = await handle(new Request("https://example.test/blog/post-1.md"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(response.headers.get("x-aeo-version")).toBe("1.0");
  });

  it("preserves upstream error responses for direct markdown requests", async () => {
    const { fetcher } = makeCustomFetcher(() =>
      new Response("<html><body>Failure</body></html>", {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }),
    );
    const handle = createAEORequestHandler({
      backend: "origin_0",
      fetcher,
    });

    const response = await handle(new Request("https://example.test/blog/post-1.md"));

    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(response.headers.get("x-aeo-version")).toBeNull();
  });

  it("preserves default trailing-slash redirect behavior", async () => {
    const { fetcher } = makeFetcher(routes);
    const handle = createAEORequestHandler({
      backend: "origin_0",
      fetcher,
    });

    const response = await handle(new Request("https://example.test/blog/"));
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe("https://example.test/blog");
  });

  it("supports internal redirects for markdown hits", async () => {
    const { fetcher } = makeFetcher(routes);
    const handle = createAEORequestHandler({
      backend: "origin_0",
      fetcher,
      redirects: { internal: { "/old-path": "/new-path" } },
    });

    const response = await handle(
      new Request("https://example.test/old-path", {
        headers: { "user-agent": "GPTBot/1.0" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-redirect-from")).toBe("/old-path");
    expect(response.headers.get("x-redirect-to")).toBe("/new-path");
    expect(await response.text()).toContain("# New");
  });

  it("supports external redirects for markdown hits", async () => {
    const { fetcher } = makeFetcher(routes);
    const handle = createAEORequestHandler({
      backend: "origin_0",
      fetcher,
      redirects: { external: { "/login": "https://app.example.com" } },
    });

    const response = await handle(
      new Request("https://example.test/login", {
        headers: { "user-agent": "GPTBot/1.0" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-redirect-to")).toBe("https://app.example.com");
    expect(await response.text()).toContain("https://app.example.com");
  });

  it("skips configured asset extensions", async () => {
    const { fetcher, calls } = makeFetcher(routes);
    const handle = createAEORequestHandler({
      backend: "origin_0",
      fetcher,
    });

    const response = await handle(
      new Request("https://example.test/style.css", {
        headers: { "user-agent": "GPTBot/1.0" },
      }),
    );

    expect(response.status).toBe(200);
    expect(calls).toEqual([{ pathname: "/style.css", backend: "origin_0" }]);
  });

  it("passes through non-GET requests", async () => {
    const { fetcher, calls } = makeFetcher(routes);
    const handle = createAEORequestHandler({
      backend: "origin_0",
      fetcher,
    });

    await handle(new Request("https://example.test/blog/post-1", { method: "POST" }));
    expect(calls).toEqual([{ pathname: "/blog/post-1", backend: "origin_0" }]);
  });

  it("passes through HEAD requests without fetching the markdown twin", async () => {
    const { fetcher, calls } = makeFetcher(routes);
    const handle = createAEORequestHandler({
      backend: "origin_0",
      fetcher,
    });

    const response = await handle(
      new Request("https://example.test/blog/post-1", {
        method: "HEAD",
        headers: { "user-agent": "GPTBot/1.0", accept: "text/markdown" },
      }),
    );

    expect(response.status).toBe(200);
    expect(calls).toEqual([{ pathname: "/blog/post-1", backend: "origin_0" }]);
  });

  it("calls hooks on hit and miss", async () => {
    const onAIRequest = vi.fn();
    const onMiss = vi.fn();
    const { fetcher } = makeFetcher(routes);
    const handle = createAEORequestHandler({
      backend: "origin_0",
      fetcher,
      hooks: { onAIRequest, onMiss },
    });

    await handle(
      new Request("https://example.test/blog/post-1", {
        headers: { "user-agent": "GPTBot/1.0" },
      }),
    );
    await handle(
      new Request("https://example.test/missing", {
        headers: { "user-agent": "GPTBot/1.0" },
      }),
    );

    expect(onAIRequest).toHaveBeenCalledOnce();
    expect(onMiss).toHaveBeenCalledOnce();
  });
});
