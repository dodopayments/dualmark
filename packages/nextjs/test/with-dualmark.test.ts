import { describe, it, expect } from "vitest";
import { withDualmark } from "../src/with-dualmark.js";
import { DualmarkConfigError } from "../src/config-validation.js";

describe("withDualmark", () => {
  it("returns a config that transpiles dualmark workspace packages", () => {
    const cfg = withDualmark<{ reactStrictMode?: boolean; transpilePackages?: string[] }>(
      { reactStrictMode: true },
      { siteUrl: "https://example.com" },
    );
    expect(cfg.transpilePackages).toContain("@dualmark/core");
    expect(cfg.transpilePackages).toContain("@dualmark/converters");
    expect(cfg.transpilePackages).toContain("@dualmark/nextjs");
    expect(cfg.reactStrictMode).toBe(true);
  });

  it("merges with user-provided transpilePackages without duplicates", () => {
    const cfg = withDualmark(
      { transpilePackages: ["foo", "@dualmark/core"] },
      { siteUrl: "https://example.com" },
    );
    expect(cfg.transpilePackages).toEqual([
      "foo",
      "@dualmark/core",
      "@dualmark/converters",
      "@dualmark/nextjs",
    ]);
  });

  it("accepts undefined nextConfig", () => {
    const cfg = withDualmark(undefined, { siteUrl: "https://example.com" });
    expect(cfg.transpilePackages).toEqual([
      "@dualmark/core",
      "@dualmark/converters",
      "@dualmark/nextjs",
    ]);
  });

  it("throws DualmarkConfigError on invalid options", () => {
    expect(() => withDualmark({}, { siteUrl: "" } as never)).toThrow(DualmarkConfigError);
  });
});
