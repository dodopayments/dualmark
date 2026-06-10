import { describe, it, expect } from "vitest";
import { resolveBuiltInConverter } from "../src/converter-registry.js";

describe("converter-registry resolveBuiltInConverter", () => {
  it("throws on unknown name", () => {
    expect(() =>
      resolveBuiltInConverter({
        name: "unknown",
        collectionName: "x",
        baseConfig: { siteUrl: "https://example.com" },
      })
    ).toThrow(/unknown built-in converter/);
  });

  it("returns a callable converter for 'blog'", () => {
    const conv = resolveBuiltInConverter({
      name: "blog",
      collectionName: "blog",
      baseConfig: { siteUrl: "https://example.com" },
    });
    const out = conv({
      id: "x",
      data: { title: "X", publishedDate: new Date("2026-01-01T00:00:00Z") } as never,
    });
    expect(out).toContain("# X");
  });

  it("returns a callable converter for 'api-reference'", () => {
    const conv = resolveBuiltInConverter({
      name: "api-reference",
      collectionName: "api",
      baseConfig: { siteUrl: "https://example.com" },
    });
    const out = conv({
      id: "get-users",
      data: {
        title: "Get Users",
        method: "get",
        path: "/users",
      },
    } as never);
    expect(out).toContain("# Get Users");
    expect(out).toContain("- **Method**: GET");
    expect(out).toContain("- **Path**: `/users`");
  });
});
