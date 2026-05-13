import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import handler from "./main.ts";

Deno.test("serves HTML to regular users", async () => {
  const req = new Request("http://localhost/pricing", {
    headers: {
      "accept": "text/html",
    },
  });
  const resp = await handler(req, {
    remoteAddr: { transport: "tcp", hostname: "127.0.0.1", port: 80 },
    completed: Promise.resolve(),
  });

  assertEquals(resp.status, 200);
  assertEquals(resp.headers.get("content-type")?.includes("text/html"), true);
  const text = await resp.text();
  assertEquals(text.includes("<h1>Pricing</h1>"), true);
});

Deno.test("serves Markdown to AI bots", async () => {
  const req = new Request("http://localhost/pricing", {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)",
    },
  });
  const resp = await handler(req, {
    remoteAddr: { transport: "tcp", hostname: "127.0.0.1", port: 80 },
    completed: Promise.resolve(),
  });

  assertEquals(resp.status, 200);
  assertEquals(resp.headers.get("content-type")?.includes("text/markdown"), true);
  const text = await resp.text();
  assertEquals(text.includes("# Pricing"), true);
});

Deno.test("serves Markdown when requested via Accept header", async () => {
  const req = new Request("http://localhost/pricing", {
    headers: {
      "accept": "text/markdown",
    },
  });
  const resp = await handler(req, {
    remoteAddr: { transport: "tcp", hostname: "127.0.0.1", port: 80 },
    completed: Promise.resolve(),
  });

  assertEquals(resp.status, 200);
  assertEquals(resp.headers.get("content-type")?.includes("text/markdown"), true);
  const text = await resp.text();
  assertEquals(text.includes("# Pricing"), true);
});

Deno.test("returns 404 for non-existent paths", async () => {
  const req = new Request("http://localhost/non-existent", {
    headers: {
      "accept": "text/html",
    },
  });
  const resp = await handler(req, {
    remoteAddr: { transport: "tcp", hostname: "127.0.0.1", port: 80 },
    completed: Promise.resolve(),
  });

  assertEquals(resp.status, 404);
});
