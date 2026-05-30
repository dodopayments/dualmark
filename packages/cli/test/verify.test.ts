import { describe, it, expect } from "vitest";
import { verifyUrl, formatTextReport, formatJsonReportV1 } from "../src/verify.js";

interface MockEntry {
  status?: number;
  headers?: Readonly<Record<string, string | undefined>>;
  body?: string;
}

function makeFetch(map: Record<string, (req: Request) => MockEntry>): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const req = new Request(input as RequestInfo, init);
    const url = new URL(req.url);
    const key = url.toString();
    const handler = map[key] ?? map[`${url.origin}${url.pathname}`];
    if (!handler) {
      return new Response("not mocked", { status: 599 });
    }
    const entry = handler(req);
    const headers = new Headers();
    for (const [k, v] of Object.entries(entry.headers ?? {})) {
      if (v !== undefined) headers.set(k, v);
    }
    return new Response(entry.body ?? "", {
      status: entry.status ?? 200,
      headers,
    });
  };
}

const FULL_MD_HEADERS = {
  "content-type": "text/markdown; charset=utf-8",
  "x-markdown-tokens": "42",
  "x-robots-tag": "noindex",
  "x-content-type-options": "nosniff",
  vary: "Accept",
  "x-aeo-version": "1.0",
};

function markdownOnlyFetch(body = "# Hello\n\nWorld."): typeof fetch {
  return makeFetch({
    "https://acme.test/blog/hello.md": () => ({
      headers: FULL_MD_HEADERS,
      body,
    }),
  });
}

describe("verifyUrl — fully conformant site (with negotiation)", () => {
  it("scores 100% of maxScore", async () => {
    const fetchImpl = makeFetch({
      "https://acme.test/blog/hello.md": (req) => {
        const accept = req.headers.get("accept") ?? "";
        if (!accept.includes("markdown")) {
          return { status: 406, headers: { vary: "Accept" } };
        }
        return { headers: FULL_MD_HEADERS, body: "# Hello\n\nWorld." };
      },
      "https://acme.test/blog/hello": (req) => {
        const ua = req.headers.get("user-agent") ?? "";
        const accept = req.headers.get("accept") ?? "";
        if (accept === "image/png") return { status: 406, headers: { vary: "Accept" } };
        if (ua.includes("GPTBot") || accept.includes("markdown")) {
          return { headers: FULL_MD_HEADERS, body: "# Hello\n\nWorld." };
        }
        return {
          headers: {
            "content-type": "text/html; charset=utf-8",
            link: '</blog/hello.md>; rel="alternate"; type="text/markdown"',
            vary: "Accept",
          },
          body: "<html></html>",
        };
      },
    });

    const report = await verifyUrl("https://acme.test/blog/hello", { fetchImpl });
    expect(report.score).toBeGreaterThanOrEqual(report.maxScore - 0);
    expect(report.failed).toHaveLength(0);
    expect(report.skippedNegotiation).toBe(false);
  });
});

describe("verifyUrl — markdown URL with --skip-negotiation", () => {
  it("scores out of reduced maxScore (no html/negotiation checks)", async () => {
    const fetchImpl = markdownOnlyFetch();

    const report = await verifyUrl("https://acme.test/blog/hello.md", {
      fetchImpl,
      skipNegotiation: true,
    });
    expect(report.skippedNegotiation).toBe(true);
    expect(report.score).toBe(report.maxScore);
    expect(report.passed.map((c) => c.id)).toContain("md.fetch");
    expect(report.passed.map((c) => c.id)).toContain("md.contentType");
    expect(report.passed.map((c) => c.id)).toContain("md.tokensHeader");
    expect(report.passed.map((c) => c.id)).toContain("md.noindex");
    expect(report.passed.map((c) => c.id)).toContain("md.vary");
    expect(report.passed.map((c) => c.id)).not.toContain("html.linkAlternate");
  });
});

describe("verifyUrl — failures", () => {
  it("fails md.fetch when markdown URL 404s", async () => {
    const fetchImpl = makeFetch({
      "https://acme.test/blog/x.md": () => ({ status: 404 }),
    });
    const report = await verifyUrl("https://acme.test/blog/x", {
      fetchImpl,
      skipNegotiation: true,
    });
    expect(report.failed.find((c) => c.id === "md.fetch")).toBeTruthy();
    expect(report.score).toBe(0);
  });

  it("fails md.tokensHeader when X-Markdown-Tokens missing", async () => {
    const fetchImpl = makeFetch({
      "https://acme.test/x.md": () => ({
        headers: {
          ...FULL_MD_HEADERS,
          "x-markdown-tokens": "",
        },
        body: "# X",
      }),
    });
    const report = await verifyUrl("https://acme.test/x", {
      fetchImpl,
      skipNegotiation: true,
    });
    expect(report.failed.find((c) => c.id === "md.tokensHeader")).toBeTruthy();
  });

  it("fails md.noindex when X-Robots-Tag missing noindex", async () => {
    const fetchImpl = makeFetch({
      "https://acme.test/x.md": () => ({
        headers: { ...FULL_MD_HEADERS, "x-robots-tag": "all" },
        body: "# X",
      }),
    });
    const report = await verifyUrl("https://acme.test/x", {
      fetchImpl,
      skipNegotiation: true,
    });
    expect(report.failed.find((c) => c.id === "md.noindex")).toBeTruthy();
  });

  it("fails md.vary when Vary missing Accept", async () => {
    const fetchImpl = makeFetch({
      "https://acme.test/x.md": () => ({
        headers: { ...FULL_MD_HEADERS, vary: "User-Agent" },
        body: "# X",
      }),
    });
    const report = await verifyUrl("https://acme.test/x", {
      fetchImpl,
      skipNegotiation: true,
    });
    expect(report.failed.find((c) => c.id === "md.vary")).toBeTruthy();
  });

  it("fails md.contentType when Content-Type wrong", async () => {
    const fetchImpl = makeFetch({
      "https://acme.test/x.md": () => ({
        headers: { ...FULL_MD_HEADERS, "content-type": "text/plain" },
        body: "# X",
      }),
    });
    const report = await verifyUrl("https://acme.test/x", {
      fetchImpl,
      skipNegotiation: true,
    });
    expect(report.failed.find((c) => c.id === "md.contentType")).toBeTruthy();
  });

  it("fails html.linkAlternate when Link header absent", async () => {
    const fetchImpl = makeFetch({
      "https://acme.test/p.md": () => ({ headers: FULL_MD_HEADERS, body: "# p" }),
      "https://acme.test/p": (req) => {
        const accept = req.headers.get("accept") ?? "";
        if (accept === "image/png") return { status: 406, headers: { vary: "Accept" } };
        if (accept.includes("markdown") || (req.headers.get("user-agent") ?? "").includes("GPTBot")) {
          return { headers: FULL_MD_HEADERS, body: "# p" };
        }
        return {
          headers: { "content-type": "text/html", vary: "Accept" },
          body: "<html></html>",
        };
      },
    });
    const report = await verifyUrl("https://acme.test/p", { fetchImpl });
    expect(report.failed.find((c) => c.id === "html.linkAlternate")).toBeTruthy();
  });
});

describe("verifyUrl — root path handling", () => {
  it("translates / → /index.md", async () => {
    const fetchImpl = makeFetch({
      "https://acme.test/index.md": () => ({ headers: FULL_MD_HEADERS, body: "# Home" }),
      "https://acme.test/": (req) => {
        const accept = req.headers.get("accept") ?? "";
        if (accept === "image/png") return { status: 406, headers: { vary: "Accept" } };
        if (accept.includes("markdown") || (req.headers.get("user-agent") ?? "").includes("GPTBot")) {
          return { headers: FULL_MD_HEADERS, body: "# Home" };
        }
        return {
          headers: {
            "content-type": "text/html",
            link: '</index.md>; rel="alternate"; type="text/markdown"',
            vary: "Accept",
          },
          body: "<html></html>",
        };
      },
    });
    const report = await verifyUrl("https://acme.test/", { fetchImpl });
    expect(report.mdUrl).toBe("https://acme.test/index.md");
    expect(report.failed).toHaveLength(0);
  });
});

describe("formatTextReport", () => {
  it("renders a multi-line text report", async () => {
    const fetchImpl = makeFetch({
      "https://acme.test/x.md": () => ({ headers: FULL_MD_HEADERS, body: "# X" }),
    });
    const report = await verifyUrl("https://acme.test/x", {
      fetchImpl,
      skipNegotiation: true,
    });
    const text = formatTextReport(report);
    expect(text).toContain("Dualmark Conformance Report");
    expect(text).toContain("https://acme.test/x");
    expect(text).toContain("Score:");
    expect(text).toContain("Passed:");
  });

  it("includes failed section when there are failures", async () => {
    const fetchImpl = makeFetch({
      "https://acme.test/x.md": () => ({ status: 500 }),
    });
    const report = await verifyUrl("https://acme.test/x", {
      fetchImpl,
      skipNegotiation: true,
    });
    const text = formatTextReport(report);
    expect(text).toContain("Failed:");
  });
});

describe("formatJsonReportV1", () => {
  it("matches the v1.0 JSON schema snapshot for a representative URL", async () => {
    const fetchImpl = markdownOnlyFetch();
    const report = await verifyUrl("https://acme.test/blog/hello", {
      fetchImpl,
      skipNegotiation: true,
    });

    const jsonReport = formatJsonReportV1({
      ...report,
      durationMs: 12,
    });

    expect(jsonReport).toMatchSnapshot();
  });
});
