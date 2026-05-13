import { createAEOHandler } from "@dualmark/deno";

/**
 * Demo upstream: serve files from ./content. For clean URLs like `/pricing`,
 * fall back to `/pricing.html`. The .md twin is requested by the adapter via
 * `/pricing.md` and served the same way.
 *
 * A real app would replace this with its framework's fetch handler
 * (Hono, Fresh, Oak, plain Deno.serve handler, etc.).
 */
const upstream = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  let pathname = url.pathname === "/" ? "/index" : url.pathname;

  // Path traversal guard — only serve within ./content.
  if (pathname.includes("..")) {
    return new Response("Forbidden", { status: 403 });
  }

  // For clean URLs (no extension), try the .html twin.
  const hasExtension = /\.[a-z0-9]+$/i.test(pathname);
  const filePath = hasExtension ? `./content${pathname}` : `./content${pathname}.html`;

  try {
    const body = await Deno.readTextFile(filePath);
    const contentType = filePath.endsWith(".md")
      ? "text/markdown; charset=utf-8"
      : "text/html; charset=utf-8";
    return new Response(body, { headers: { "content-type": contentType } });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
};

const handler = createAEOHandler({ upstream });

if (import.meta.main) {
  Deno.serve({ port: 8000 }, handler);
}

export default handler;
