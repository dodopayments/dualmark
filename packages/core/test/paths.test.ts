import { describe, expect, it } from "vitest";
import { toMarkdownPath, toMarkdownUrl } from "../src/paths.js";

describe("toMarkdownPath", () => {
  it("maps root to /index.md", () => {
    expect(toMarkdownPath("/")).toBe("/index.md");
    expect(toMarkdownPath("")).toBe("/index.md");
  });

  it("strips trailing slash and appends .md", () => {
    expect(toMarkdownPath("/blog")).toBe("/blog.md");
    expect(toMarkdownPath("/blog/")).toBe("/blog.md");
    expect(toMarkdownPath("/blog/post")).toBe("/blog/post.md");
    expect(toMarkdownPath("/blog/post/")).toBe("/blog/post.md");
  });

  it("strips multiple trailing slashes", () => {
    expect(toMarkdownPath("/a///")).toBe("/a.md");
  });

  it("is idempotent on already-.md paths", () => {
    expect(toMarkdownPath("/blog.md")).toBe("/blog.md");
    expect(toMarkdownPath("/blog/post.md")).toBe("/blog/post.md");
    expect(toMarkdownPath("/index.md")).toBe("/index.md");
  });

  it("does not double the extension for a .md path with a trailing slash", () => {
    expect(toMarkdownPath("/a.md/")).toBe("/a.md");
    expect(toMarkdownPath("/blog/post.md/")).toBe("/blog/post.md");
  });

  it("handles deep nesting", () => {
    expect(toMarkdownPath("/a/b/c/d/e")).toBe("/a/b/c/d/e.md");
  });
});

describe("toMarkdownUrl", () => {
  it("converts full URL pathname", () => {
    expect(toMarkdownUrl("https://example.com/blog/post")).toBe(
      "https://example.com/blog/post.md",
    );
  });

  it("preserves search and hash", () => {
    expect(toMarkdownUrl("https://example.com/blog?q=1#h")).toBe(
      "https://example.com/blog.md?q=1#h",
    );
  });

  it("maps root URL to /index.md", () => {
    expect(toMarkdownUrl("https://example.com/")).toBe(
      "https://example.com/index.md",
    );
    expect(toMarkdownUrl("https://example.com")).toBe(
      "https://example.com/index.md",
    );
  });

  it("is idempotent on already-.md URLs", () => {
    expect(toMarkdownUrl("https://example.com/blog.md")).toBe(
      "https://example.com/blog.md",
    );
  });

  it("accepts URL objects", () => {
    expect(toMarkdownUrl(new URL("https://example.com/foo/"))).toBe(
      "https://example.com/foo.md",
    );
  });
});
