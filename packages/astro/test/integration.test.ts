import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createDualmarkIntegration } from "../src/integration.js";

function makeFakeContext(rootDir: string) {
  const injected: Array<{ pattern: string; entrypoint: string | URL; prerender?: boolean }> = [];
  const middlewares: Array<{ order: string; entrypoint: string | URL }> = [];
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return {
    config: { root: pathToFileURL(rootDir + "/") },
    command: "build" as const,
    injectRoute: (r: { pattern: string; entrypoint: string | URL; prerender?: boolean }) =>
      injected.push(r),
    addMiddleware: (m: { order: string; entrypoint: string | URL }) => middlewares.push(m),
    logger,
    injected,
    middlewares,
  };
}

describe("createDualmarkIntegration — astro:config:setup", () => {
  let tmpRoot: string;
  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), "dualmark-test-"));
  });

  it("returns an integration with name @dualmark/astro", () => {
    const integ = createDualmarkIntegration({ siteUrl: "https://example.com" });
    expect(integ.name).toBe("@dualmark/astro");
    expect(typeof integ.hooks["astro:config:setup"]).toBe("function");
  });

  it("injects detail + listing routes for a collection", async () => {
    const integ = createDualmarkIntegration({
      siteUrl: "https://example.com",
      collections: { blog: { converter: "blog" } },
    });
    const ctx = makeFakeContext(tmpRoot);
    await integ.hooks["astro:config:setup"](ctx);
    const patterns = ctx.injected.map((r) => r.pattern);
    expect(patterns).toContain("/blog/[...slug].md");
    expect(patterns).toContain("/blog.md");
    expect(ctx.middlewares).toHaveLength(1);
    expect(ctx.middlewares[0]?.entrypoint).toBe("@dualmark/astro/middleware");
  });

  it("uses single slug strategy when configured", async () => {
    const integ = createDualmarkIntegration({
      siteUrl: "https://example.com",
      collections: { glossary: { converter: "glossary", slugStrategy: "single" } },
    });
    const ctx = makeFakeContext(tmpRoot);
    await integ.hooks["astro:config:setup"](ctx);
    expect(ctx.injected.map((r) => r.pattern)).toContain("/glossary/[slug].md");
  });

  it("respects custom route", async () => {
    const integ = createDualmarkIntegration({
      siteUrl: "https://example.com",
      collections: { blog: { converter: "blog", route: "articles" } },
    });
    const ctx = makeFakeContext(tmpRoot);
    await integ.hooks["astro:config:setup"](ctx);
    expect(ctx.injected.map((r) => r.pattern)).toContain("/articles/[...slug].md");
    expect(ctx.injected.map((r) => r.pattern)).toContain("/articles.md");
  });

  it("emits no listing when emitListing=false", async () => {
    const integ = createDualmarkIntegration({
      siteUrl: "https://example.com",
      collections: { blog: { converter: "blog", emitListing: false } },
    });
    const ctx = makeFakeContext(tmpRoot);
    await integ.hooks["astro:config:setup"](ctx);
    const patterns = ctx.injected.map((r) => r.pattern);
    expect(patterns).toContain("/blog/[...slug].md");
    expect(patterns).not.toContain("/blog.md");
  });

  it("injects routes for staticPages", async () => {
    const integ = createDualmarkIntegration({
      siteUrl: "https://example.com",
      staticPages: [
        { pattern: "/", render: () => "# Home" },
        { pattern: "/about", render: () => "# About" },
      ],
    });
    const ctx = makeFakeContext(tmpRoot);
    await integ.hooks["astro:config:setup"](ctx);
    const patterns = ctx.injected.map((r) => r.pattern);
    expect(patterns).toContain("/index.md");
    expect(patterns).toContain("/about.md");
  });

  it("injects routes for parameterizedRoutes", async () => {
    const integ = createDualmarkIntegration({
      siteUrl: "https://example.com",
      parameterizedRoutes: [
        {
          pattern: "/blog/category/[category]",
          getStaticPaths: () => [{ params: { category: "x" } }],
          render: ({ params }) => `# ${params.category}`,
        },
      ],
    });
    const ctx = makeFakeContext(tmpRoot);
    await integ.hooks["astro:config:setup"](ctx);
    expect(ctx.injected.map((r) => r.pattern)).toContain("/blog/category/[category].md");
  });

  it("injects llms.txt route when enabled", async () => {
    const integ = createDualmarkIntegration({
      siteUrl: "https://example.com",
      llmsTxt: { enabled: true, brandName: "Acme", sections: [] },
    });
    const ctx = makeFakeContext(tmpRoot);
    await integ.hooks["astro:config:setup"](ctx);
    expect(ctx.injected.map((r) => r.pattern)).toContain("/llms.txt");
  });

  it("does NOT inject middleware when injectLinkHeader=false", async () => {
    const integ = createDualmarkIntegration({
      siteUrl: "https://example.com",
      collections: { blog: { converter: "blog" } },
      middleware: { injectLinkHeader: false },
    });
    const ctx = makeFakeContext(tmpRoot);
    await integ.hooks["astro:config:setup"](ctx);
    expect(ctx.middlewares).toHaveLength(0);
  });

  it("writes a config.mjs into node_modules/.dualmark-generated", async () => {
    const integ = createDualmarkIntegration({
      siteUrl: "https://example.com",
      collections: { blog: { converter: "blog" } },
    });
    const ctx = makeFakeContext(tmpRoot);
    await integ.hooks["astro:config:setup"](ctx);
    const configPath = join(tmpRoot, "node_modules", ".dualmark-generated", "config.mjs");
    expect(existsSync(configPath)).toBe(true);
    const content = readFileSync(configPath, "utf8");
    expect(content).toContain('"siteUrl": "https://example.com"');
  });

  it("writes generated route files alongside the config", async () => {
    const integ = createDualmarkIntegration({
      siteUrl: "https://example.com",
      collections: { blog: { converter: "blog" } },
    });
    const ctx = makeFakeContext(tmpRoot);
    await integ.hooks["astro:config:setup"](ctx);
    for (const r of ctx.injected) {
      const fp = typeof r.entrypoint === "string" ? r.entrypoint : r.entrypoint.pathname;
      expect(existsSync(fp)).toBe(true);
    }
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("warns when converter is a function (not yet serializable)", async () => {
    const integ = createDualmarkIntegration({
      siteUrl: "https://example.com",
      collections: {
        custom: { converter: () => "# x" },
      },
    });
    const ctx = makeFakeContext(tmpRoot);
    await integ.hooks["astro:config:setup"](ctx);
    expect(ctx.logger.warn).toHaveBeenCalled();
  });
});

describe("converter-registry resolveBuiltInConverter", () => {
  it("throws on unknown name", async () => {
    const { resolveBuiltInConverter } = await import("../src/converter-registry.js");
    expect(() =>
      resolveBuiltInConverter({
        name: "unknown",
        collectionName: "x",
        baseConfig: { siteUrl: "https://example.com" },
      }),
    ).toThrow(/unknown built-in converter/);
  });

  it("returns a callable converter for 'blog'", async () => {
    const { resolveBuiltInConverter } = await import("../src/converter-registry.js");
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

  it("returns a callable converter for 'api-reference'", async () => {
    const { resolveBuiltInConverter } = await import("../src/converter-registry.js");
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

  it("returns a callable converter for 'status-page'", async () => {
    const { resolveBuiltInConverter } = await import("../src/converter-registry.js");
    const conv = resolveBuiltInConverter({
      name: "status-page",
      collectionName: "status",
      baseConfig: { siteUrl: "https://example.com" },
    });
    const out = conv({
      id: "main",
      data: {
        title: "System Status",
        url: "https://status.example.com",
        overall: "operational",
        components: [],
      },
    } as never);
    expect(out).toContain("# System Status");
    expect(out).toContain("No incidents reported.");
  });
});
