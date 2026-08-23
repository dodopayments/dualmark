import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createAEORequestHandler, createAEOFetchEventHandler } from "../src/index.js";

// Mock minimal FetchEvent
class MockFetchEvent {
  request: Request;
  waitUntilPromises: Promise<any>[] = [];

  constructor(request: Request) {
    this.request = request;
  }

  waitUntil(promise: Promise<any>) {
    this.waitUntilPromises.push(promise);
  }
}

describe("Fastly Adapter", () => {
  let mockBackendResponses: Record<string, Record<string, string | null>> = {};
  
  beforeEach(() => {
    mockBackendResponses = {
      default_backend: {
        "/blog/post-1": "<html>Post 1</html>",
        "/": "<html>Home</html>",
        "/api/foo": "{}",
      },
      markdown_backend: {
        "/blog/post-1.md": "# Post 1\n\nBody.",
        "/index.md": "# Home\n\nWelcome.",
        "/new-path.md": "# New\n\nMoved."
      }
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (req: Request | string, init?: RequestInit & { backend?: string }) => {
        const url = new URL((req as Request).url ?? (req as string));
        const backend = init?.backend ?? "default_backend";
        
        // Simulate a network failure when 'failure' is in the URL
        if (url.pathname.includes('failure')) {
          throw new TypeError("Network failure");
        }

        const body = mockBackendResponses[backend]?.[url.pathname];
        
        if (body === undefined) {
          return new Response("Not found", { status: 404 });
        }
        
        const isHtml = typeof body === "string" && body.startsWith("<html>");
        const headers = new Headers();
        if (isHtml) headers.set("Content-Type", "text/html");
        
        return new Response(body, { status: 200, headers });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("markdown serving", () => {
    it("serves markdown to AI bot UA on existing path", async () => {
      const handler = createAEORequestHandler({
        backend: "default_backend",
        markdownBackend: "markdown_backend"
      });
      
      const req = new Request("https://acme.test/blog/post-1", {
        headers: { "user-agent": "GPTBot/1.0" },
      });
      const res = await handler(req);
      
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
      expect(res.headers.get("x-markdown-tokens")).toBe("4");
      expect(res.headers.get("x-aeo-version")).toBe("1.0");
      expect(res.headers.get("vary")).toBe("Accept");
      expect(res.headers.get("x-robots-tag")).toBe("noindex");
      expect(await res.text()).toBe("# Post 1\n\nBody.");
      
      // Ensure fetch was called with markdown backend
      expect(fetch).toHaveBeenCalledWith(expect.any(Request), { backend: "markdown_backend" });
    });

    it("keeps a bot UA on HTML when it explicitly requests text/html (spec §5)", async () => {
      const handler = createAEORequestHandler({
        backend: "default_backend",
        markdownBackend: "markdown_backend"
      });
      const req = new Request("https://acme.test/blog/post-1", {
        headers: { "user-agent": "GPTBot/1.0", accept: "text/html" },
      });
      const res = await handler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");
      expect(res.headers.get("content-type")).not.toContain("text/markdown");
      expect(res.headers.get("x-robots-tag")).toBeNull();
      expect(await res.text()).toBe("<html>Post 1</html>");
    });

    it("uses custom tokenizer when provided", async () => {
      const handler = createAEORequestHandler({
        backend: "default_backend",
        markdownBackend: "markdown_backend",
        tokenizer: () => 999,
      });
      
      const req = new Request("https://acme.test/blog/post-1", {
        headers: { "user-agent": "GPTBot/1.0" },
      });
      const res = await handler(req);
      
      expect(res.headers.get("x-markdown-tokens")).toBe("999");
    });

    it("serves markdown when Accept: text/markdown (no bot UA)", async () => {
      const handler = createAEORequestHandler({
        backend: "default_backend",
        markdownBackend: "markdown_backend"
      });
      const req = new Request("https://acme.test/blog/post-1", {
        headers: { accept: "text/markdown" },
      });
      const res = await handler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    });

    it("returns 406 when Accept rules out html and markdown", async () => {
      const handler = createAEORequestHandler({ backend: "default_backend" });
      const req = new Request("https://acme.test/blog/post-1", {
        headers: { accept: "image/png" },
      });
      const res = await handler(req);
      expect(res.status).toBe(406);
      expect(res.headers.get("vary")).toBe("Accept");
    });

    it("falls through to upstream for browser UA", async () => {
      const handler = createAEORequestHandler({ backend: "default_backend" });
      const req = new Request("https://acme.test/blog/post-1", {
        headers: {
          "user-agent": "Mozilla/5.0 Chrome/130",
          accept: "text/html,*/*;q=0.8",
        },
      });
      const res = await handler(req);
      expect(res.status).toBe(200);
      const link = res.headers.get("link") ?? "";
      expect(link).toContain('</blog/post-1.md>; rel="alternate"; type="text/markdown"');
      expect(res.headers.get("vary")).toContain("Accept");
      
      expect(fetch).toHaveBeenCalledWith(req, { backend: "default_backend" });
    });

    it("injects Link and Vary on HTML with a mixed-case Content-Type", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(
          async () =>
            new Response("<html></html>", {
              status: 200,
              headers: { "Content-Type": "Text/HTML; charset=UTF-8" },
            }),
        ),
      );
      const handler = createAEORequestHandler({ backend: "default_backend" });
      const req = new Request("https://acme.test/page", {
        headers: {
          "user-agent": "Mozilla/5.0 Chrome/130",
          accept: "text/html,*/*;q=0.8",
        },
      });
      const res = await handler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("link")).toContain('rel="alternate"');
      expect(res.headers.get("vary")).toContain("Accept");
    });

    it("handles missing .md (cache miss) for bot — falls to upstream HTML", async () => {
      const handler = createAEORequestHandler({
        backend: "default_backend",
        markdownBackend: "markdown_backend"
      });
      const req = new Request("https://acme.test/blog/missing", {
        headers: { "user-agent": "GPTBot/1.0" },
      });
      const res = await handler(req);
      // Wait, Fastly fallback will call upstream default_backend which returns 404
      expect(res.status).toBe(404);
      expect(fetch).toHaveBeenCalledTimes(2); // First markdown_backend, then default_backend
    });

    it("decorates direct .md requests with full AEO headers", async () => {
      const handler = createAEORequestHandler({
        backend: "default_backend",
        markdownBackend: "markdown_backend"
      });
      const req = new Request("https://acme.test/blog/post-1.md");
      const res = await handler(req);
      
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
      expect(res.headers.get("X-Markdown-Tokens")).toMatch(/^\d+$/);
      expect(await res.text()).toBe("# Post 1\n\nBody.");
      expect(fetch).toHaveBeenCalledWith(req, { backend: "markdown_backend" });
    });
    
    it("returns 404 for direct .md request when asset missing", async () => {
      const handler = createAEORequestHandler({ backend: "default_backend" });
      const req = new Request("https://acme.test/missing.md");
      const res = await handler(req);
      expect(res.status).toBe(404);
    });
  });

  describe("redirects and skip rules", () => {
    it("follows internal redirect for AI bot to canonical .md", async () => {
      const handler = createAEORequestHandler({
        backend: "default_backend",
        markdownBackend: "markdown_backend",
        redirects: { internal: { "/old-path": "/new-path" } },
      });
      const req = new Request("https://acme.test/old-path", {
        headers: { "user-agent": "GPTBot/1.0" },
      });
      const res = await handler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("x-redirect-from")).toBe("/old-path");
      expect(res.headers.get("x-redirect-to")).toBe("/new-path");
      expect(await res.text()).toContain("# New");
    });

    it("returns markdown notice for external redirect", async () => {
      const handler = createAEORequestHandler({
        backend: "default_backend",
        redirects: { external: { "/login": "https://app.example.com" } },
      });
      const req = new Request("https://acme.test/login", {
        headers: { "user-agent": "GPTBot/1.0" },
      });
      const res = await handler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("x-redirect-to")).toBe("https://app.example.com");
      expect(await res.text()).toContain("https://app.example.com");
    });

    it("skips /api/ paths entirely", async () => {
      const handler = createAEORequestHandler({ backend: "default_backend" });
      const req = new Request("https://acme.test/api/foo", {
        headers: { "user-agent": "GPTBot/1.0" },
      });
      const res = await handler(req);
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("{}");
      expect(fetch).toHaveBeenCalledTimes(1); // Only default_backend
    });
  });

  describe("trailing slash", () => {
    it("redirects /path/ → /path with 301 by default", async () => {
      const handler = createAEORequestHandler({ backend: "default_backend" });
      const req = new Request("https://acme.test/blog/");
      const res = await handler(req);
      expect(res.status).toBe(301);
      expect(res.headers.get("location")).toBe("https://acme.test/blog");
    });

    it("preserves trailing slash with mode=preserve", async () => {
      const handler = createAEORequestHandler({
        backend: "default_backend",
        trailingSlash: "preserve",
      });
      const req = new Request("https://acme.test/blog/");
      const res = await handler(req);
      expect(res.status).toBe(404); // Passed to backend
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("redirects /path → /path/ with mode=always", async () => {
      const handler = createAEORequestHandler({
        backend: "default_backend",
        trailingSlash: "always",
      });
      const req = new Request("https://acme.test/blog");
      const res = await handler(req);
      expect(res.status).toBe(301);
      expect(res.headers.get("location")).toBe("https://acme.test/blog/");
    });
  });

  describe("methods and failures", () => {
    it("POST passthrough", async () => {
      const handler = createAEORequestHandler({ backend: "default_backend" });
      const req = new Request("https://acme.test/blog/post-1", {
        method: "POST",
        body: "{}",
        headers: { "user-agent": "GPTBot/1.0" },
      });
      const res = await handler(req);
      expect(res.status).toBe(200); // Passthrough to default_backend html
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("HEAD requests act like GET for logic but backend handles it", async () => {
      const handler = createAEORequestHandler({
        backend: "default_backend",
        markdownBackend: "markdown_backend"
      });
      const req = new Request("https://acme.test/blog/post-1", {
        method: "HEAD",
        headers: { "user-agent": "GPTBot/1.0" },
      });
      const res = await handler(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    });

    it("Fetch failure handling", async () => {
      const handler = createAEORequestHandler({ backend: "default_backend" });
      const req = new Request("https://acme.test/failure.md");
      const res = await handler(req);
      expect(res.status).toBe(404); // Handled as fallback or missing
    });
  });

  describe("Hooks execution", () => {
    it("calls onAIRequest on hit via FetchEvent handler", async () => {
      const onAIRequest = vi.fn();
      const handler = createAEOFetchEventHandler({
        backend: "default_backend",
        markdownBackend: "markdown_backend",
        hooks: { onAIRequest },
      });
      
      const req = new Request("https://acme.test/blog/post-1", {
        headers: { "user-agent": "GPTBot/1.0" },
      });
      const event = new MockFetchEvent(req);
      
      await handler(event as any);
      
      expect(onAIRequest).toHaveBeenCalledOnce();
      expect(event.waitUntilPromises).toHaveLength(1); // WaitUntil was called
    });

    it("calls onMiss on cache miss via raw handler", async () => {
      const onMiss = vi.fn();
      const handler = createAEORequestHandler({
        backend: "default_backend",
        markdownBackend: "markdown_backend",
        hooks: { onMiss },
      });
      
      const req = new Request("https://acme.test/missing", {
        headers: { "user-agent": "GPTBot/1.0" },
      });
      
      let waitUntilPromise: Promise<any> | undefined;
      await handler(req, (p) => { waitUntilPromise = p; });
      
      expect(onMiss).toHaveBeenCalledOnce();
      expect(waitUntilPromise).toBeDefined(); // wait until was used
    });
  });
});
