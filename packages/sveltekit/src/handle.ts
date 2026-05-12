import {
  detectAIBot,
  injectMarkdownAlternateLink,
  negotiateFormat,
  toMarkdownPath,
} from "@dualmark/core";
import { resolveConfig } from "./config-validation.js";
import type { DualmarkSvelteKitConfig, ResolvedDualmarkSvelteKitConfig } from "./types.js";
import type { Handle } from "@sveltejs/kit";

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface EventLike {
  url: URL;
  request: Request;
  fetch: FetchLike;
}

type ResolveLike = (event: EventLike) => Response | Promise<Response>;

export type DualmarkHandle = Handle;

function shouldSkip(
  pathname: string,
  skipPaths: ReadonlyArray<string>,
  method: string,
  appDir: string,
): boolean {
  if (method !== "GET" && method !== "HEAD") return true;
  if (pathname === "/llms.txt") return true;
  if (pathname.endsWith(".md")) return true;
  if (pathname === "/favicon.ico" || pathname.startsWith(`/${appDir}/`)) return true;
  for (const skip of skipPaths) {
    if (pathname === skip || pathname.startsWith(skip.endsWith("/") ? skip : `${skip}/`)) {
      return true;
    }
  }
  return false;
}

function notAcceptable(): Response {
  return new Response("Not Acceptable\n\nSupported: text/html, text/markdown\n", {
    status: 406,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      Vary: "Accept",
    },
  });
}

async function fetchMarkdownTwin(event: EventLike, pathname: string): Promise<Response> {
  const mdPath = toMarkdownPath(pathname);
  return event.fetch(mdPath, {
    headers: event.request.headers,
  });
}

export async function handleRequest(
  event: EventLike,
  resolve: ResolveLike,
  resolved: ResolvedDualmarkSvelteKitConfig,
): Promise<Response> {
  const { pathname } = event.url;

  if (!shouldSkip(pathname, resolved.middleware.skipPaths, event.request.method, resolved.appDir)) {
    const userAgent = event.request.headers.get("user-agent") ?? "";
    const accept = event.request.headers.get("accept") ?? "";
    const bot = detectAIBot(userAgent);
    const format = negotiateFormat(accept);

    if (bot.isBot || format === "markdown") {
      return fetchMarkdownTwin(event, pathname);
    }

    if (format === null && accept) {
      return notAcceptable();
    }
  }

  const response = await resolve(event);
  if (!resolved.middleware.injectLinkHeader) return response;
  if (pathname.endsWith(".md")) return response;

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("text/html")) return response;

  return injectMarkdownAlternateLink(response, pathname, toMarkdownPath(pathname));
}

export function createDualmarkHandle(input: DualmarkSvelteKitConfig): DualmarkHandle {
  const resolved = resolveConfig(input);
  return async ({ event, resolve }) =>
    handleRequest(
      {
        url: event.url,
        request: event.request,
        fetch: event.fetch,
      },
      () => resolve(event),
      resolved,
    );
}
