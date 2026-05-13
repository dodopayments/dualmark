import type { Handle } from "@sveltejs/kit";
import { describe, expect, it, vi } from "vitest";
import { resolveConfig } from "../src/config-validation.js";
import { createDualmarkHandle, handleRequest, type FetchLike } from "../src/handle.js";

function makeEvent(
  url: string,
  headers: Record<string, string> = {},
  fetchImpl?: FetchLike,
  method = "GET",
) {
  return {
    url: new URL(url),
    request: new Request(url, { method, headers }),
    fetch:
      fetchImpl ??
      (async () =>
        new Response("# Markdown", {
          headers: { "Content-Type": "text/markdown; charset=utf-8" },
        })),
  };
}

describe("handleRequest", () => {
  const resolved = resolveConfig({ siteUrl: "https://example.com" });

  it("fetches the markdown twin for Accept: text/markdown", async () => {
    const fetch = vi.fn(async () => new Response("# Markdown"));
    const resolve = vi.fn(async () => new Response("<html></html>"));
    const response = await handleRequest(
      makeEvent("https://example.com/posts/hello", { accept: "text/markdown" }, fetch),
      resolve,
      resolved,
    );

    expect(fetch).toHaveBeenCalledWith("/posts/hello.md", expect.any(Object));
    expect(resolve).not.toHaveBeenCalled();
    expect(await response.text()).toBe("# Markdown");
  });

  it("fetches the markdown twin for AI bot user agents", async () => {
    const fetch = vi.fn(async () => new Response("# Bot Markdown"));
    await handleRequest(
      makeEvent("https://example.com/posts/hello", { "user-agent": "GPTBot/1.0" }, fetch),
      async () => new Response("<html></html>"),
      resolved,
    );

    expect(fetch).toHaveBeenCalledWith("/posts/hello.md", expect.any(Object));
  });

  it("returns 406 when Accept rules out HTML and markdown", async () => {
    const response = await handleRequest(
      makeEvent("https://example.com/posts/hello", { accept: "image/png" }),
      async () => new Response("<html></html>"),
      resolved,
    );

    expect(response.status).toBe(406);
    expect(response.headers.get("vary")).toBe("Accept");
  });

  it("preserves headers while adding Link alternate and Vary: Accept", async () => {
    const response = await handleRequest(
      makeEvent("https://example.com/posts/hello", { accept: "text/html" }),
      async () =>
        new Response("<html></html>", {
          headers: {
            "Content-Type": "text/html",
            Link: "</style.css>; rel=preload",
            Vary: "Cookie",
            "X-Existing": "yes",
          },
        }),
      resolved,
    );

    expect(response.headers.get("x-existing")).toBe("yes");
    expect(response.headers.get("link")).toContain("</style.css>; rel=preload");
    expect(response.headers.get("link")).toContain(
      '</posts/hello.md>; rel="alternate"; type="text/markdown"',
    );
    expect(response.headers.get("vary")).toContain("Cookie");
    expect(response.headers.get("vary")).toContain("Accept");
  });

  it("resolves direct markdown paths without negotiating again", async () => {
    const fetch = vi.fn();
    const resolve = vi.fn(async () => new Response("# Direct"));
    const response = await handleRequest(
      makeEvent("https://example.com/posts/hello.md", { accept: "text/markdown" }, fetch),
      resolve,
      resolved,
    );

    expect(fetch).not.toHaveBeenCalled();
    expect(resolve).toHaveBeenCalled();
    expect(await response.text()).toBe("# Direct");
  });

  it("injects Link alternate on HTML responses for non-GET methods (skips negotiation only)", async () => {
    const response = await handleRequest(
      makeEvent("https://example.com/posts/hello", {}, undefined, "POST"),
      async () =>
        new Response("<html><form method='post'>ok</form></html>", {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
      resolved,
    );

    expect(response.headers.get("link")).toContain(
      '</posts/hello.md>; rel="alternate"; type="text/markdown"',
    );
  });
});

describe("createDualmarkHandle", () => {
  function sequenceForTest(...handlers: Handle[]): Handle {
    return async ({ event, resolve }) => {
      async function run(index: number, nextEvent: typeof event): Promise<Response> {
        const handler = handlers[index];
        if (!handler) return resolve(nextEvent);
        return handler({
          event: nextEvent,
          resolve: (resolvedEvent) => run(index + 1, resolvedEvent),
        });
      }
      return run(0, event);
    };
  }

  it("composes predictably in a SvelteKit handle chain", async () => {
    const order: string[] = [];
    const first: Handle = async ({ event, resolve }) => {
      order.push("first-pre");
      const response = await resolve(event);
      order.push("first-post");
      return response;
    };
    const second: Handle = async ({ event, resolve }) => {
      order.push("second-pre");
      const response = await resolve(event);
      order.push("second-post");
      return response;
    };
    const handle = sequenceForTest(
      first,
      createDualmarkHandle({ siteUrl: "https://example.com" }),
      second,
    );

    const response = await handle({
      event: makeEvent("https://example.com/posts/hello", { accept: "text/html" }) as never,
      resolve: async () => {
        order.push("resolve");
        return new Response("<html></html>", { headers: { "Content-Type": "text/html" } });
      },
    });

    expect(order).toEqual(["first-pre", "second-pre", "resolve", "second-post", "first-post"]);
    expect(response.headers.get("link")).toContain("/posts/hello.md");
  });
});
