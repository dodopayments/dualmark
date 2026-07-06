import { detectAIBot, negotiateFormat, toMarkdownPath } from "@dualmark/core";
import { resolveConfig } from "./config-validation.js";
import { createDualmarkResourceRoute } from "./handlers.js";
import type { DualmarkRemixConfig } from "./types.js";

export type ReactRouterEntryHandler<TRouterContext = unknown, TLoadContext = unknown> = (
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: TRouterContext,
  loadContext: TLoadContext,
) => Response | Promise<Response>;

function appendVaryAccept(headers: Headers): void {
  const existing = headers.get("Vary");
  if (!existing) {
    headers.set("Vary", "Accept");
    return;
  }
  const tokens = existing.split(",").map((token) => token.trim().toLowerCase());
  if (!tokens.includes("accept")) headers.set("Vary", `${existing}, Accept`);
}

function shouldSkip(pathname: string, skipPaths: ReadonlyArray<string>): boolean {
  if (pathname === "/llms.txt" || pathname.endsWith(".md")) return true;
  for (const skip of skipPaths) {
    if (pathname === skip || pathname.startsWith(skip.endsWith("/") ? skip : `${skip}/`)) {
      return true;
    }
  }
  return false;
}

function markdownRequest(request: Request): Request {
  const url = new URL(request.url);
  url.pathname = toMarkdownPath(url.pathname);
  return new Request(url, {
    method: request.method,
    headers: request.headers,
    signal: request.signal,
  });
}

function withoutBody(response: Response): Response {
  return new Response(null, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export function createDualmarkEntryServer(
  input: DualmarkRemixConfig,
): <TRouterContext = unknown, TLoadContext = unknown>(
  handler: ReactRouterEntryHandler<TRouterContext, TLoadContext>,
) => ReactRouterEntryHandler<TRouterContext, TLoadContext> {
  const resolved = resolveConfig(input);
  const markdownRoute = createDualmarkResourceRoute(resolved);
  return (handler) => async (request, responseStatusCode, responseHeaders, routerContext, loadContext) => {
    const method = request.method.toUpperCase();
    const pathname = new URL(request.url).pathname;
    if (method !== "GET" && method !== "HEAD") {
      return handler(request, responseStatusCode, responseHeaders, routerContext, loadContext);
    }
    if (!shouldSkip(pathname, resolved.middleware.skipPaths)) {
      const accept = request.headers.get("accept") ?? "";
      const bot = detectAIBot(request.headers.get("user-agent") ?? "");
      const format = negotiateFormat(accept);
      if (format === null && accept) {
        return new Response("Not Acceptable\n\nSupported: text/html, text/markdown\n", {
          status: 406,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            Vary: "Accept",
          },
        });
      }
      if (bot.isBot || format === "markdown") {
        const response = await markdownRoute.loader({ request: markdownRequest(request), params: {} });
        return method === "HEAD" ? withoutBody(response) : response;
      }
      if (resolved.middleware.injectLinkHeader) {
        const link = `<${toMarkdownPath(pathname)}>; rel="alternate"; type="text/markdown"`;
        const existing = responseHeaders.get("Link");
        responseHeaders.set("Link", existing ? `${existing}, ${link}` : link);
        appendVaryAccept(responseHeaders);
      }
    }
    return handler(request, responseStatusCode, responseHeaders, routerContext, loadContext);
  };
}
