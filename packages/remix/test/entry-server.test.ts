import { describe, expect, it } from "vitest";
import { createDualmarkEntryServer } from "../src/entry-server.js";
import type { DualmarkRemixConfig } from "../src/types.js";

function titleFromData(data: unknown): string {
  if (typeof data === "object" && data !== null && "title" in data) {
    const title = data.title;
    return typeof title === "string" ? title : "Untitled";
  }
  return "Untitled";
}

const config: DualmarkRemixConfig = {
  siteUrl: "https://example.com",
  collections: {
    posts: {
      converter: (entry) => `# ${titleFromData(entry.data)}`,
      route: "posts",
      slugStrategy: "single",
      getEntries: () => [
        { id: "hello", data: { title: "Hello" }, body: "Hello body." },
      ],
    },
  },
};

describe("createDualmarkEntryServer", () => {
  it("serves markdown before render for bot user agents", async () => {
    const entry = createDualmarkEntryServer(config)(async () => new Response("html"));

    const response = await entry(
      new Request("https://example.com/posts/hello", {
        headers: { "user-agent": "GPTBot/1.0" },
      }),
      200,
      new Headers(),
      {},
      {},
    );

    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(await response.text()).toContain("# Hello");
  });

  it("adds Link alternate headers before rendering HTML", async () => {
    const entry = createDualmarkEntryServer(config)(async (_request, _status, headers) =>
      new Response("html", { headers }),
    );

    const response = await entry(
      new Request("https://example.com/posts/hello", {
        headers: { accept: "text/html" },
      }),
      200,
      new Headers(),
      {},
      {},
    );

    expect(response.headers.get("link")).toContain("</posts/hello.md>");
    expect(response.headers.get("vary")).toContain("Accept");
  });

  it("returns 406 when Accept excludes HTML and markdown", async () => {
    const entry = createDualmarkEntryServer(config)(async () => new Response("html"));

    const response = await entry(
      new Request("https://example.com/posts/hello", {
        headers: { accept: "image/png" },
      }),
      200,
      new Headers(),
      {},
      {},
    );

    expect(response.status).toBe(406);
  });

  it("strips markdown response bodies for HEAD requests", async () => {
    const entry = createDualmarkEntryServer(config)(async () => new Response("html"));

    const response = await entry(
      new Request("https://example.com/posts/hello", {
        method: "HEAD",
        headers: { accept: "text/markdown" },
      }),
      200,
      new Headers(),
      {},
      {},
    );

    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(await response.text()).toBe("");
  });
});
