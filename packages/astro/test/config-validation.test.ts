import { describe, it, expect } from "vitest";
import { resolveConfig, DualmarkConfigError } from "../src/config-validation.js";

describe("resolveConfig", () => {
  it("requires siteUrl", () => {
    expect(() => resolveConfig({} as never)).toThrow(DualmarkConfigError);
  });

  it("rejects siteUrl with trailing slash", () => {
    expect(() => resolveConfig({ siteUrl: "https://example.com/" })).toThrow(/must not end with/);
  });

  it("rejects invalid URL", () => {
    expect(() => resolveConfig({ siteUrl: "not-a-url" })).toThrow(/not a valid URL/);
  });

  it("accepts minimal valid config", () => {
    const out = resolveConfig({ siteUrl: "https://example.com" });
    expect(out.siteUrl).toBe("https://example.com");
    expect(out.collections).toEqual({});
    expect(out.staticPages).toEqual([]);
    expect(out.parameterizedRoutes).toEqual([]);
    expect(out.middleware.injectLinkHeader).toBe(true);
    expect(out.headers.cacheControl).toBe("public, max-age=3600");
    expect(out.headers.noindex).toBe(true);
  });

  it("rejects collection with leading slash route", () => {
    expect(() =>
      resolveConfig({
        siteUrl: "https://example.com",
        collections: { blog: { converter: "blog", route: "/blog" } },
      }),
    ).toThrow(/should not start with/);
  });

  it("rejects collection without converter", () => {
    expect(() =>
      resolveConfig({
        siteUrl: "https://example.com",
        collections: { blog: { converter: "" as unknown as string } },
      }),
    ).toThrow(/missing 'converter'/);
  });

  it("rejects staticPage without leading slash", () => {
    expect(() =>
      resolveConfig({
        siteUrl: "https://example.com",
        staticPages: [{ pattern: "about", render: () => "" }],
      }),
    ).toThrow(/must start with/);
  });

  it("rejects parameterizedRoute without [param]", () => {
    expect(() =>
      resolveConfig({
        siteUrl: "https://example.com",
        parameterizedRoutes: [{ pattern: "blog/all", getStaticPaths: () => [], render: () => "" }],
      }),
    ).toThrow(/must contain at least one/);
  });

  it("respects middleware.injectLinkHeader=false", () => {
    const out = resolveConfig({
      siteUrl: "https://example.com",
      middleware: { injectLinkHeader: false },
    });
    expect(out.middleware.injectLinkHeader).toBe(false);
  });

  it("respects custom cacheControl + noindex=false", () => {
    const out = resolveConfig({
      siteUrl: "https://example.com",
      headers: { cacheControl: "no-cache", noindex: false },
    });
    expect(out.headers.cacheControl).toBe("no-cache");
    expect(out.headers.noindex).toBe(false);
  });

  it("appends the file path to the error message when provided", () => {
    expect(() => resolveConfig({} as never, "/abs/astro.config.mjs")).toThrow(
      /\[\/abs\/astro\.config\.mjs\]/,
    );
  });

  it("does not include a bracketed prefix when filePath is omitted", () => {
    let message = "";
    try {
      resolveConfig({} as never);
    } catch (e) {
      if (e instanceof Error) message = e.message;
    }
    expect(message).not.toMatch(/^\[/);
    expect(message).toMatch(/^Dualmark config error:/);
  });

  it("produces the exact error format: [filePath] Dualmark config error: <msg>", () => {
    expect(() => resolveConfig(null as never, "/abs/astro.config.mjs")).toThrow(
      /^\[\/abs\/astro\.config\.mjs\] Dualmark config error: Config must be an object$/,
    );
  });
});
