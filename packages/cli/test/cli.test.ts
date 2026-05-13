import { describe, it, expect, vi } from "vitest";
import { main } from "../src/main.js";

const MARKDOWN_HEADERS = {
  "content-type": "text/markdown; charset=utf-8",
  "x-markdown-tokens": "42",
  "x-robots-tag": "noindex",
  "x-content-type-options": "nosniff",
  vary: "Accept",
  "x-aeo-version": "1.0",
};

function mockFetchForJsonSuccess(): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const req = new Request(input as RequestInfo, init);
    if (new URL(req.url).toString() === "https://acme.test/blog/hello.md") {
      return new Response("# Hello", { status: 200, headers: MARKDOWN_HEADERS });
    }
    return new Response("not mocked", { status: 599 });
  };
}

function mockFetchForRequiredFailure(): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const req = new Request(input as RequestInfo, init);
    const url = new URL(req.url).toString();
    const accept = req.headers.get("accept") ?? "";
    const ua = req.headers.get("user-agent") ?? "";
    if (url === "https://acme.test/high-score.md") {
      return new Response("# High Score", { status: 200, headers: MARKDOWN_HEADERS });
    }
    if (url !== "https://acme.test/high-score") {
      return new Response("not mocked", { status: 599 });
    }
    if (accept === "text/html,application/xhtml+xml,*/*;q=0.8") {
      return new Response("html down", { status: 500, headers: { "content-type": "text/html" } });
    }
    if (accept === "image/png") {
      return new Response("", { status: 406, headers: { vary: "Accept" } });
    }
    if (ua.includes("GPTBot") || accept.includes("markdown")) {
      return new Response("# High Score", { status: 200, headers: MARKDOWN_HEADERS });
    }
    return new Response("not mocked", { status: 599 });
  };
}

async function withMockedFetch<T>(fetchImpl: typeof fetch, run: () => Promise<T>): Promise<T> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try {
    return await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

describe("CLI argument parsing & exit codes", () => {
  it("prints help and exits 0 for no args", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const code = await main(["node", "dualmark"]);
    expect(code).toBe(0);
    expect(stdout).toHaveBeenCalled();
    stdout.mockRestore();
  });

  it("prints version and exits 0 for --version", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const code = await main(["node", "dualmark", "--version"]);
    expect(code).toBe(0);
    expect(stdout.mock.calls.flat().join("")).toContain("0.1.0");
    stdout.mockRestore();
  });

  it("returns 2 on missing url", async () => {
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const code = await main(["node", "dualmark", "verify"]);
    expect(code).toBe(2);
    stderr.mockRestore();
    stdout.mockRestore();
  });

  it("returns 2 on invalid url", async () => {
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const code = await main(["node", "dualmark", "verify", "not a url"]);
    expect(code).toBe(2);
    stderr.mockRestore();
  });

  it("prints help and exits 0 for `verify --help`", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const code = await main(["node", "dualmark", "verify", "--help"]);
    expect(code).toBe(0);
    expect(stderr).not.toHaveBeenCalled();
    expect(stdout.mock.calls.flat().join("")).toContain("Usage:");
    stdout.mockRestore();
    stderr.mockRestore();
  });

  it("prints help and exits 0 for `verify -h`", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const code = await main(["node", "dualmark", "verify", "-h"]);
    expect(code).toBe(0);
    expect(stdout.mock.calls.flat().join("")).toContain("Usage:");
    stdout.mockRestore();
  });

  it("prints JSON report for --json", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      const code = await withMockedFetch(mockFetchForJsonSuccess(), () =>
        main([
          "node",
          "dualmark",
          "verify",
          "https://acme.test/blog/hello",
          "--skip-negotiation",
          "--json",
        ]),
      );
      const output = stdout.mock.calls.flat().join("");
      expect(code).toBe(0);
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty("url", "https://acme.test/blog/hello");
      expect(parsed).toHaveProperty("markdownUrl", "https://acme.test/blog/hello.md");
      expect(parsed).toHaveProperty("checks");
    } finally {
      stdout.mockRestore();
    }
  });

  it("returns 2 when --json is combined with --quiet", async () => {
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const code = await main([
      "node",
      "dualmark",
      "verify",
      "https://acme.test/blog/hello",
      "--json",
      "--quiet",
    ]);
    expect(code).toBe(2);
    expect(stderr.mock.calls.flat().join("")).toContain("--json cannot be combined");
    stderr.mockRestore();
  });

  it("returns 2 when --json is combined with --color", async () => {
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const code = await main([
      "node",
      "dualmark",
      "verify",
      "https://acme.test/blog/hello",
      "--json",
      "--color",
    ]);
    expect(code).toBe(2);
    expect(stderr.mock.calls.flat().join("")).toContain("--json cannot be combined");
    stderr.mockRestore();
  });

  it("accepts --json with --no-color (no-op)", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    try {
      const code = await withMockedFetch(mockFetchForJsonSuccess(), () =>
        main([
          "node",
          "dualmark",
          "verify",
          "https://acme.test/blog/hello",
          "--skip-negotiation",
          "--json",
          "--no-color",
        ]),
      );
      expect(code).toBe(0);
      expect(stderr).not.toHaveBeenCalled();
      const parsed = JSON.parse(stdout.mock.calls.flat().join(""));
      expect(parsed).toHaveProperty("url", "https://acme.test/blog/hello");
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
    }
  });

  it("returns non-zero when a required check fails", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      const code = await withMockedFetch(mockFetchForRequiredFailure(), () =>
        main(["node", "dualmark", "verify", "https://acme.test/high-score", "--json"]),
      );
      expect(code).toBe(1);
    } finally {
      stdout.mockRestore();
    }
  });

  it("suppresses stdout with --quiet on success", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    try {
      const code = await withMockedFetch(mockFetchForJsonSuccess(), () =>
        main([
          "node",
          "dualmark",
          "verify",
          "https://acme.test/blog/hello",
          "--skip-negotiation",
          "--quiet",
        ]),
      );
      expect(code).toBe(0);
      expect(stdout).not.toHaveBeenCalled();
      expect(stderr).not.toHaveBeenCalled();
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
    }
  });

  it("still prints report with --quiet on failure", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      const code = await withMockedFetch(mockFetchForRequiredFailure(), () =>
        main(["node", "dualmark", "verify", "https://acme.test/high-score", "--quiet"]),
      );
      expect(code).toBe(1);
      expect(stdout).toHaveBeenCalled();
    } finally {
      stdout.mockRestore();
    }
  });
});
