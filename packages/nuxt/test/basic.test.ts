import { describe, it, expect } from "vitest";
import { resolveConfig, DualmarkConfigError } from "../src/config-validation.js";
import { resolveBuiltInConverter } from "../src/runtime/server/converter-registry.js";

describe("resolveConfig", () => {
  it("accepts a minimal valid config", () => {
    const cfg = resolveConfig({ siteUrl: "https://example.com" });
    expect(cfg.siteUrl).toBe("https://example.com");
    expect(cfg.collections).toEqual({});
    expect(cfg.staticPages).toEqual([]);
    expect(cfg.parameterizedRoutes).toEqual([]);
  });

  it("throws DualmarkConfigError when siteUrl is missing", () => {
    expect(() => resolveConfig({} as any)).toThrow(DualmarkConfigError);
  });

  it("throws DualmarkConfigError when siteUrl ends with /", () => {
    expect(() =>
      resolveConfig({ siteUrl: "https://example.com/" })
    ).toThrow(DualmarkConfigError);
  });

  it("throws DualmarkConfigError for an invalid URL", () => {
    expect(() =>
      resolveConfig({ siteUrl: "not-a-url" })
    ).toThrow(DualmarkConfigError);
  });

  it("defaults cacheControl to 'public, max-age=3600'", () => {
    const cfg = resolveConfig({ siteUrl: "https://example.com" });
    expect(cfg.headers.cacheControl).toBe("public, max-age=3600");
  });

  it("defaults noindex to true", () => {
    const cfg = resolveConfig({ siteUrl: "https://example.com" });
    expect(cfg.headers.noindex).toBe(true);
  });

  it("respects noindex: false override", () => {
    const cfg = resolveConfig({
      siteUrl: "https://example.com",
      headers: { noindex: false },
    });
    expect(cfg.headers.noindex).toBe(false);
  });

  it("throws when a collection is missing converter", () => {
    expect(() =>
      resolveConfig({
        siteUrl: "https://example.com",
        collections: { blog: {} as any },
      })
    ).toThrow(DualmarkConfigError);
  });

  it("throws when a collection route starts with /", () => {
    expect(() =>
      resolveConfig({
        siteUrl: "https://example.com",
        collections: { blog: { converter: "blog", route: "/blog" } },
      })
    ).toThrow(DualmarkConfigError);
  });

  it("throws when a staticPage pattern does not start with /", () => {
    expect(() =>
      resolveConfig({
        siteUrl: "https://example.com",
        staticPages: [{ pattern: "about", render: () => "# About" }],
      })
    ).toThrow(DualmarkConfigError);
  });

  it("throws when a staticPage render is not a function", () => {
    expect(() =>
      resolveConfig({
        siteUrl: "https://example.com",
        staticPages: [{ pattern: "/about", render: "# About" as any }],
      })
    ).toThrow(DualmarkConfigError);
  });

  it("throws when a parameterizedRoute pattern has no [param]", () => {
    expect(() =>
      resolveConfig({
        siteUrl: "https://example.com",
        parameterizedRoutes: [
          {
            pattern: "/no-params",
            getStaticPaths: async () => [],
            render: () => "",
          },
        ],
      })
    ).toThrow(DualmarkConfigError);
  });

  it("accepts a function tokenizer", () => {
    const cfg = resolveConfig({
      siteUrl: "https://example.com",
      tokenizer: (t) => t.length,
    });
    expect(typeof cfg.tokenizer).toBe("function");
  });

  it("accepts a ./ relative tokenizer module path", () => {
    const cfg = resolveConfig({
      siteUrl: "https://example.com",
      tokenizer: "./src/aeo-tokenizer.ts",
    });
    expect(cfg.tokenizer).toBe("./src/aeo-tokenizer.ts");
  });

  it("accepts a ../ relative tokenizer module path", () => {
    const cfg = resolveConfig({
      siteUrl: "https://example.com",
      tokenizer: "../shared/tokenizer.ts",
    });
    expect(cfg.tokenizer).toBe("../shared/tokenizer.ts");
  });

  it("throws when tokenizer module path is empty", () => {
    expect(() =>
      resolveConfig({ siteUrl: "https://example.com", tokenizer: "" })
    ).toThrow(/must not be empty/);
  });

  it("throws when tokenizer module path is not relative (absolute)", () => {
    expect(() =>
      resolveConfig({ siteUrl: "https://example.com", tokenizer: "/abs/tokenizer.ts" })
    ).toThrow(/must be a relative path/);
  });

  it("throws when tokenizer module path is a bare specifier", () => {
    expect(() =>
      resolveConfig({ siteUrl: "https://example.com", tokenizer: "my-tokenizer" })
    ).toThrow(/must be a relative path/);
  });
});

describe("resolveBuiltInConverter", () => {
  const baseArgs = {
    collectionName: "blog",
    baseConfig: { siteUrl: "https://example.com" },
  };

  it.each([
    "blog",
    "case-study",
    "changelog",
    "compare",
    "docs",
    "feature",
    "glossary",
    "legal",
    "pricing",
    "pseo",
    "tool",
    "video",
  ] as const)("resolves built-in converter '%s'", (name) => {
    const fn = resolveBuiltInConverter({ ...baseArgs, name });
    expect(typeof fn).toBe("function");
  });

  it("throws on an unknown converter name", () => {
    expect(() =>
      resolveBuiltInConverter({ ...baseArgs, name: "nonexistent" })
    ).toThrow();
  });
});
