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
    expect(out.internalNamespace).toBe("md");
    expect(out.collections).toEqual({});
    expect(out.staticPages).toEqual([]);
    expect(out.parameterizedRoutes).toEqual([]);
    expect(out.middleware.injectLinkHeader).toBe(true);
    expect(out.middleware.skipPaths).toEqual([]);
    expect(out.headers.cacheControl).toBe("public, max-age=3600");
    expect(out.headers.noindex).toBe(true);
  });

  it("accepts custom internalNamespace", () => {
    const out = resolveConfig({ siteUrl: "https://example.com", internalNamespace: "_md" });
    expect(out.internalNamespace).toBe("_md");
  });

  it("strips slashes from internalNamespace", () => {
    const out = resolveConfig({ siteUrl: "https://example.com", internalNamespace: "/md/" });
    expect(out.internalNamespace).toBe("md");
  });

  it("rejects reserved internalNamespace", () => {
    expect(() =>
      resolveConfig({ siteUrl: "https://example.com", internalNamespace: "_next" }),
    ).toThrow(/reserved/);
    expect(() =>
      resolveConfig({ siteUrl: "https://example.com", internalNamespace: "api" }),
    ).toThrow(/reserved/);
  });

  it("rejects internalNamespace with invalid characters", () => {
    expect(() =>
      resolveConfig({ siteUrl: "https://example.com", internalNamespace: "weird/chars" }),
    ).toThrow(/match/);
  });

  it("rejects collection without converter", () => {
    expect(() =>
      resolveConfig({
        siteUrl: "https://example.com",
        collections: { blog: { converter: "" as unknown as string, getEntries: () => [] } },
      }),
    ).toThrow(/missing 'converter'/);
  });

  it("rejects collection without getEntries", () => {
    expect(() =>
      resolveConfig({
        siteUrl: "https://example.com",
        collections: {
          blog: { converter: "blog" } as never,
        },
      }),
    ).toThrow(/missing 'getEntries'/);
  });

  it("rejects collection with leading slash route", () => {
    expect(() =>
      resolveConfig({
        siteUrl: "https://example.com",
        collections: {
          blog: { converter: "blog", route: "/blog", getEntries: () => [] },
        },
      }),
    ).toThrow(/should not start with/);
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
        parameterizedRoutes: [
          { pattern: "/blog/all", getStaticPaths: () => [], render: () => "" },
        ],
      }),
    ).toThrow(/must contain at least one/);
  });

  it("rejects parameterizedRoute without leading slash", () => {
    expect(() =>
      resolveConfig({
        siteUrl: "https://example.com",
        parameterizedRoutes: [
          { pattern: "tax/[country]", getStaticPaths: () => [], render: () => "" },
        ],
      }),
    ).toThrow(/must start with/);
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

  it("respects middleware.skipPaths", () => {
    const out = resolveConfig({
      siteUrl: "https://example.com",
      middleware: { skipPaths: ["/admin", "/internal"] },
    });
    expect(out.middleware.skipPaths).toEqual(["/admin", "/internal"]);
  });
});
