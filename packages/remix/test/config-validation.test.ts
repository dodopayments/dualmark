import { describe, expect, it } from "vitest";
import { DualmarkConfigError, resolveConfig } from "../src/config-validation.js";

describe("resolveConfig", () => {
  it("normalizes default options when given a valid config", () => {
    const resolved = resolveConfig({ siteUrl: "https://example.com" });

    expect(resolved.configPath).toBe("app/dualmark.config.ts");
    expect(resolved.generatedDir).toBe("app/.dualmark-remix");
    expect(resolved.middleware.injectLinkHeader).toBe(true);
    expect(resolved.headers.cacheControl).toBe("public, max-age=3600");
  });

  it("rejects a siteUrl with a trailing slash", () => {
    expect(() => resolveConfig({ siteUrl: "https://example.com/" })).toThrow(
      DualmarkConfigError,
    );
  });

  it("rejects absolute configPath and generatedDir on Windows", () => {
    expect(() =>
      resolveConfig({ siteUrl: "https://example.com", configPath: "C:\\tmp\\dualmark.ts" }),
    ).toThrow(DualmarkConfigError);
    expect(() =>
      resolveConfig({ siteUrl: "https://example.com", generatedDir: "\\tmp\\dualmark" }),
    ).toThrow(DualmarkConfigError);
  });

  it("rejects collection routes that start with a slash", () => {
    expect(() =>
      resolveConfig({
        siteUrl: "https://example.com",
        collections: {
          posts: {
            converter: "blog",
            route: "/posts",
            getEntries: () => [],
          },
        },
      }),
    ).toThrow(DualmarkConfigError);
  });

  it("rejects collection routes with unsafe route-pattern syntax", () => {
    for (const route of ["../posts", "posts\\drafts", "posts/:id", "posts/*", "posts?.drafts"]) {
      expect(() =>
        resolveConfig({
          siteUrl: "https://example.com",
          collections: {
            posts: {
              converter: "blog",
              route,
              getEntries: () => [],
            },
          },
        }),
      ).toThrow(DualmarkConfigError);
    }
  });

  it("rejects static and parameterized patterns with backslashes or traversal", () => {
    expect(() =>
      resolveConfig({
        siteUrl: "https://example.com",
        staticPages: [{ pattern: "/..\\windows", render: () => "# Nope" }],
      }),
    ).toThrow(DualmarkConfigError);
    expect(() =>
      resolveConfig({
        siteUrl: "https://example.com",
        parameterizedRoutes: [
          {
            pattern: "/docs\\[slug]",
            getStaticPaths: () => [{ params: { slug: "x" } }],
            render: () => "# Nope",
          },
        ],
      }),
    ).toThrow(DualmarkConfigError);
  });

  it("rejects catch-all slugs because React Router cannot suffix splats with .md", () => {
    expect(() =>
      resolveConfig({
        siteUrl: "https://example.com",
        collections: {
          docs: {
            converter: "docs",
            slugStrategy: "catch-all",
            getEntries: () => [],
          },
        },
      }),
    ).toThrow(/catch-all/);
  });
});
