import { describe, it, expect } from "vitest";
import {
  markdownResponse,
  injectMarkdownAlternateLink,
  renderLinkAlternateHeader,
} from "../src/markdown.js";

describe("markdownResponse", () => {
  it("returns 200 with text/markdown content type", async () => {
    const r = markdownResponse("# Hello");
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
  });

  it("sets X-Markdown-Tokens to integer count", async () => {
    const r = markdownResponse("hello world foo");
    expect(r.headers.get("x-markdown-tokens")).toBe("3");
  });

  it("sets default X-Robots-Tag: noindex", () => {
    const r = markdownResponse("# x");
    expect(r.headers.get("x-robots-tag")).toBe("noindex");
  });

  it("omits X-Robots-Tag when noindex=false", () => {
    const r = markdownResponse("# x", { noindex: false });
    expect(r.headers.get("x-robots-tag")).toBeNull();
  });

  it("sets default Cache-Control", () => {
    const r = markdownResponse("# x");
    expect(r.headers.get("cache-control")).toBe("public, max-age=3600");
  });

  it("respects custom Cache-Control", () => {
    const r = markdownResponse("# x", { cacheControl: "no-cache" });
    expect(r.headers.get("cache-control")).toBe("no-cache");
  });

  it("sets Vary: Accept", () => {
    const r = markdownResponse("# x");
    expect(r.headers.get("vary")).toBe("Accept");
  });

  it("sets X-Content-Type-Options: nosniff", () => {
    const r = markdownResponse("# x");
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("sets X-AEO-Version: 1.0", () => {
    const r = markdownResponse("# x");
    expect(r.headers.get("x-aeo-version")).toBe("1.0");
  });

  it("sets redirect headers when supplied", () => {
    const r = markdownResponse("# x", {
      redirectFrom: "/old",
      redirectTo: "/new",
    });
    expect(r.headers.get("x-redirect-from")).toBe("/old");
    expect(r.headers.get("x-redirect-to")).toBe("/new");
  });

  it("merges extra headers", () => {
    const r = markdownResponse("# x", {
      extraHeaders: { "X-Custom": "value" },
    });
    expect(r.headers.get("x-custom")).toBe("value");
  });

  it("normalizes Unicode in body", async () => {
    const r = markdownResponse("\u201Chi\u201D");
    const text = await r.text();
    expect(text).toBe('"hi"');
  });

  it("respects custom status", () => {
    const r = markdownResponse("# x", { status: 404 });
    expect(r.status).toBe(404);
  });

  it("uses custom tokenizer for X-Markdown-Tokens when provided", () => {
    const charCounter = (text: string) => text.length;
    const r = markdownResponse("hello world", { tokenizer: charCounter });
    expect(r.headers.get("x-markdown-tokens")).toBe("11");
  });
});

describe("renderLinkAlternateHeader", () => {
  it("formats a markdown alternate Link header value", () => {
    expect(renderLinkAlternateHeader("/x", "/x.md")).toBe(
      '</x.md>; rel="alternate"; type="text/markdown"',
    );
  });
});

describe("injectMarkdownAlternateLink", () => {
  it("appends Link header on response without one", () => {
    const orig = new Response("<html></html>", {
      headers: { "Content-Type": "text/html" },
    });
    const out = injectMarkdownAlternateLink(orig, "/x", "/x.md");
    expect(out.headers.get("link")).toBe('</x.md>; rel="alternate"; type="text/markdown"');
  });

  it("appends to existing Link header preserving prior value", () => {
    const orig = new Response("<html></html>", {
      headers: {
        "Content-Type": "text/html",
        Link: '</style.css>; rel="preload"; as="style"',
      },
    });
    const out = injectMarkdownAlternateLink(orig, "/x", "/x.md");
    const link = out.headers.get("link") ?? "";
    expect(link).toContain('</style.css>; rel="preload"; as="style"');
    expect(link).toContain('</x.md>; rel="alternate"; type="text/markdown"');
  });

  it("adds Vary: Accept when missing", () => {
    const orig = new Response("<html></html>");
    const out = injectMarkdownAlternateLink(orig, "/x", "/x.md");
    expect(out.headers.get("vary")).toBe("Accept");
  });

  it("appends Accept to existing Vary preserving prior tokens", () => {
    const orig = new Response("<html></html>", { headers: { Vary: "User-Agent" } });
    const out = injectMarkdownAlternateLink(orig, "/x", "/x.md");
    expect(out.headers.get("vary")).toBe("User-Agent, Accept");
  });

  it("does not duplicate Accept in Vary if already present", () => {
    const orig = new Response("<html></html>", { headers: { Vary: "Accept, User-Agent" } });
    const out = injectMarkdownAlternateLink(orig, "/x", "/x.md");
    expect(out.headers.get("vary")).toBe("Accept, User-Agent");
  });

  it("preserves status and body", async () => {
    const orig = new Response("body-text", { status: 201 });
    const out = injectMarkdownAlternateLink(orig, "/x", "/x.md");
    expect(out.status).toBe(201);
    expect(await out.text()).toBe("body-text");
  });
});
