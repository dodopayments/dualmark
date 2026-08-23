import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  parseAcceptHeader,
  mediaTypeMatches,
  negotiateFormat,
  shouldServeMarkdown,
  registerFormat,
  getRegisteredFormats,
} from "../src/negotiation.js";

describe("parseAcceptHeader", () => {
  it("returns empty array for empty string", () => {
    expect(parseAcceptHeader("")).toEqual([]);
  });

  it("parses a single type with default q=1", () => {
    expect(parseAcceptHeader("text/html")).toEqual([
      { type: "text", subtype: "html", quality: 1.0 },
    ]);
  });

  it("parses explicit q-values", () => {
    const r = parseAcceptHeader("text/html;q=0.9, text/markdown;q=0.7");
    expect(r[0]?.quality).toBe(0.9);
    expect(r[1]?.quality).toBe(0.7);
  });

  it("sorts by quality descending", () => {
    const r = parseAcceptHeader("text/plain;q=0.3, text/html;q=0.9, text/markdown;q=0.7");
    expect(r[0]).toMatchObject({ subtype: "html", quality: 0.9 });
    expect(r[1]).toMatchObject({ subtype: "markdown", quality: 0.7 });
    expect(r[2]).toMatchObject({ subtype: "plain", quality: 0.3 });
  });

  it("prefers specific types over wildcards at equal quality", () => {
    const r = parseAcceptHeader("*/*, text/html");
    expect(r[0]).toMatchObject({ type: "text", subtype: "html" });
    expect(r[1]).toMatchObject({ type: "*", subtype: "*" });
  });

  it("prefers subtype-specific over subtype-wildcard at equal quality", () => {
    const r = parseAcceptHeader("text/*, text/html");
    expect(r[0]).toMatchObject({ subtype: "html" });
    expect(r[1]).toMatchObject({ subtype: "*" });
  });

  it("clamps q-values to [0, 1]", () => {
    const r = parseAcceptHeader("text/html;q=1.5, text/plain;q=-0.5");
    expect(r[0]?.quality).toBe(1.0);
    expect(r[1]?.quality).toBe(0);
  });

  it("handles browser-style Accept headers", () => {
    const r = parseAcceptHeader(
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    );
    expect(r.length).toBe(4);
    expect(r[0]?.quality).toBe(1.0);
    expect(r[r.length - 1]?.quality).toBe(0.8);
  });

  it("handles extra whitespace", () => {
    const r = parseAcceptHeader("  text/html  ;  q=0.9  ,  text/markdown  ;  q=0.5  ");
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ type: "text", subtype: "html", quality: 0.9 });
    expect(r[1]).toMatchObject({ type: "text", subtype: "markdown", quality: 0.5 });
  });

  it("normalizes types to lowercase", () => {
    const r = parseAcceptHeader("Text/HTML, APPLICATION/JSON");
    expect(r[0]).toMatchObject({ type: "text", subtype: "html" });
    expect(r[1]).toMatchObject({ type: "application", subtype: "json" });
  });

  it("treats missing q-value as 0 (malformed)", () => {
    const r = parseAcceptHeader("text/html;q=");
    expect(r[0]?.quality).toBe(0);
  });

  it("ignores non-q parameters", () => {
    const r = parseAcceptHeader("text/html;charset=utf-8;q=0.8;level=1");
    expect(r[0]).toMatchObject({ quality: 0.8, type: "text", subtype: "html" });
  });

  it("handles three decimal q-values", () => {
    const r = parseAcceptHeader("text/html;q=0.123");
    expect(r[0]?.quality).toBeCloseTo(0.123);
  });

  it("parses Chrome's real Accept header", () => {
    const chrome =
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7";
    const r = parseAcceptHeader(chrome);
    expect(r.length).toBeGreaterThan(5);
    expect(r[0]?.quality).toBe(1.0);
  });

  it("parses curl default Accept (*/*)", () => {
    expect(parseAcceptHeader("*/*")).toEqual([{ type: "*", subtype: "*", quality: 1.0 }]);
  });
});

describe("mediaTypeMatches", () => {
  it("matches exact type", () => {
    expect(mediaTypeMatches({ type: "text", subtype: "html", quality: 1 }, "text", "html")).toBe(true);
  });
  it("rejects mismatched type", () => {
    expect(mediaTypeMatches({ type: "text", subtype: "html", quality: 1 }, "application", "json")).toBe(false);
  });
  it("rejects mismatched subtype", () => {
    expect(mediaTypeMatches({ type: "text", subtype: "html", quality: 1 }, "text", "plain")).toBe(false);
  });
  it("matches wildcard subtype", () => {
    expect(mediaTypeMatches({ type: "text", subtype: "*", quality: 1 }, "text", "markdown")).toBe(true);
  });
  it("wildcard subtype rejects wrong type", () => {
    expect(mediaTypeMatches({ type: "text", subtype: "*", quality: 1 }, "application", "json")).toBe(false);
  });
  it("matches full wildcard", () => {
    expect(mediaTypeMatches({ type: "*", subtype: "*", quality: 1 }, "application", "json")).toBe(true);
  });
  it("rejects q=0 entries", () => {
    expect(mediaTypeMatches({ type: "text", subtype: "html", quality: 0 }, "text", "html")).toBe(false);
  });
  it("matches application/xhtml+xml exactly", () => {
    expect(mediaTypeMatches({ type: "application", subtype: "xhtml+xml", quality: 1 }, "application", "xhtml+xml")).toBe(true);
  });
});

describe("negotiateFormat — defaults and basics", () => {
  it("defaults to html when no Accept header", () => {
    expect(negotiateFormat("")).toBe("html");
  });
  it("returns html for text/html only", () => {
    expect(negotiateFormat("text/html")).toBe("html");
  });
  it("returns markdown for text/markdown only", () => {
    expect(negotiateFormat("text/markdown")).toBe("markdown");
  });
  it("returns html for application/xhtml+xml only", () => {
    expect(negotiateFormat("application/xhtml+xml")).toBe("html");
  });
});

describe("negotiateFormat — q-value preference", () => {
  it("returns html when html has higher q than markdown", () => {
    expect(negotiateFormat("text/html;q=0.9, text/markdown;q=0.1")).toBe("html");
  });
  it("returns markdown when markdown has higher q than html", () => {
    expect(negotiateFormat("text/html;q=0.1, text/markdown;q=0.9")).toBe("markdown");
  });
  it("returns html when both have equal q (html is default first)", () => {
    expect(negotiateFormat("text/html, text/markdown")).toBe("html");
  });
  it("returns html when explicit equal q values", () => {
    expect(negotiateFormat("text/html;q=0.5, text/markdown;q=0.5")).toBe("html");
  });
  it("returns markdown when html excluded via q=0", () => {
    expect(negotiateFormat("text/html;q=0, text/markdown;q=1")).toBe("markdown");
  });
  it("returns html when markdown excluded via q=0", () => {
    expect(negotiateFormat("text/html;q=1, text/markdown;q=0")).toBe("html");
  });
  it("handles small q-value differences", () => {
    expect(negotiateFormat("text/html;q=0.900, text/markdown;q=0.901")).toBe("markdown");
  });
  it("xhtml+xml beats markdown when q higher", () => {
    expect(negotiateFormat("application/xhtml+xml;q=0.9, text/markdown;q=0.5")).toBe("html");
  });
  it("markdown beats xhtml+xml when q higher", () => {
    expect(negotiateFormat("application/xhtml+xml;q=0.3, text/markdown;q=0.8")).toBe("markdown");
  });
});

describe("negotiateFormat — wildcards", () => {
  it("returns html for */*", () => {
    expect(negotiateFormat("*/*")).toBe("html");
  });
  it("returns html for text/*", () => {
    expect(negotiateFormat("text/*")).toBe("html");
  });
  it("returns null for */*;q=0", () => {
    expect(negotiateFormat("*/*;q=0")).toBeNull();
  });
  it("explicit markdown beats wildcard html", () => {
    expect(negotiateFormat("*/*;q=0.1, text/markdown;q=0.9")).toBe("markdown");
  });
  it("explicit html beats wildcard markdown", () => {
    expect(negotiateFormat("text/html;q=0.9, */*;q=0.1")).toBe("html");
  });
});

describe("negotiateFormat — 406 Not Acceptable", () => {
  it("returns null for unsupported type without wildcard", () => {
    expect(negotiateFormat("application/x-content-negotiation-probe")).toBeNull();
  });
  it("returns null for application/json only", () => {
    expect(negotiateFormat("application/json")).toBeNull();
  });
  it("returns null for image/png only", () => {
    expect(negotiateFormat("image/png")).toBeNull();
  });
  it("returns null when both excluded via q=0", () => {
    expect(negotiateFormat("text/html;q=0, text/markdown;q=0")).toBeNull();
  });
  it("returns null for text/plain only (wrong subtype)", () => {
    expect(negotiateFormat("text/plain")).toBeNull();
  });
});

describe("negotiateFormat — real-world headers", () => {
  it("Chrome", () => {
    expect(negotiateFormat(
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    )).toBe("html");
  });
  it("curl default", () => {
    expect(negotiateFormat("*/*")).toBe("html");
  });
  it("AI agent requesting markdown", () => {
    expect(negotiateFormat("text/markdown")).toBe("markdown");
  });
  it("AI agent preferring markdown over html", () => {
    expect(negotiateFormat("text/markdown, text/html;q=0.5")).toBe("markdown");
  });
});

describe("negotiateFormat — custom available formats", () => {
  it("returns first available when accept is empty", () => {
    expect(negotiateFormat("", ["markdown", "html"])).toBe("markdown");
  });
  it("respects available list ordering for ties", () => {
    expect(negotiateFormat("text/html;q=0.5, text/markdown;q=0.5", ["markdown", "html"])).toBe("markdown");
  });
  it("returns null when no available format in registry", () => {
    expect(negotiateFormat("text/html", ["unknown-format" as never])).toBeNull();
  });
  it("returns null for empty available list", () => {
    expect(negotiateFormat("text/html", [])).toBeNull();
  });
});

describe("registerFormat / getRegisteredFormats", () => {
  it("registers new format and negotiates against it", () => {
    registerFormat("json-test", [["application", "json"]]);
    expect(getRegisteredFormats()).toContain("json-test");
    expect(negotiateFormat("application/json", ["json-test"])).toBe("json-test");
  });
});

describe("parseAcceptHeader — property tests", () => {
  it("never throws on random input", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(() => parseAcceptHeader(s)).not.toThrow();
      }),
      { numRuns: 200 },
    );
  });

  it("always returns sorted-by-quality output", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const r = parseAcceptHeader(s);
        for (let i = 1; i < r.length; i++) {
          const prev = r[i - 1];
          const curr = r[i];
          if (prev && curr) {
            expect(prev.quality).toBeGreaterThanOrEqual(curr.quality);
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it("all qualities are within [0, 1]", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const r = parseAcceptHeader(s);
        for (const item of r) {
          expect(item.quality).toBeGreaterThanOrEqual(0);
          expect(item.quality).toBeLessThanOrEqual(1);
        }
      }),
      { numRuns: 200 },
    );
  });

  it("negotiateFormat never throws on random Accept", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(() => negotiateFormat(s)).not.toThrow();
      }),
      { numRuns: 200 },
    );
  });
});

describe("shouldServeMarkdown", () => {
  it("serves markdown when Accept explicitly negotiates markdown (any UA)", () => {
    expect(shouldServeMarkdown("text/markdown", false)).toBe(true);
    expect(shouldServeMarkdown("text/markdown", true)).toBe(true);
  });

  it("serves markdown to a bot with no Accept or a wildcard Accept", () => {
    expect(shouldServeMarkdown("", true)).toBe(true);
    expect(shouldServeMarkdown("*/*", true)).toBe(true);
    expect(shouldServeMarkdown("text/*", true)).toBe(true);
  });

  it("keeps a bot on HTML when it explicitly requests text/html (spec §5)", () => {
    // "UA detection MUST NOT override an explicit Accept"
    expect(shouldServeMarkdown("text/html", true)).toBe(false);
  });

  it("keeps a bot on HTML when HTML strictly outranks markdown", () => {
    // Browser-like Accept from a bot UA: html=1.0 > markdown(via wildcard)=0.8
    expect(shouldServeMarkdown("text/html,application/xhtml+xml,*/*;q=0.8", true)).toBe(false);
  });

  it("does not serve markdown to a non-bot unless Accept asks for it", () => {
    expect(shouldServeMarkdown("", false)).toBe(false);
    expect(shouldServeMarkdown("*/*", false)).toBe(false);
    expect(shouldServeMarkdown("text/html", false)).toBe(false);
  });
});
