import { detectAIBot, negotiateFormat, toMarkdownPath } from "@dualmark/core";
import { resolveConfig } from "./config-validation.js";
import type { DualmarkNextConfig, ResolvedDualmarkNextConfig } from "./types.js";

interface NextLikeRequest {
  readonly headers: Headers;
  readonly nextUrl: URL & { clone: () => URL };
  readonly url: string;
}

interface NextLikeResponseStatic {
  next: () => NextLikeResponse;
  rewrite: (url: URL) => NextLikeResponse;
  redirect: (url: URL, status?: number) => NextLikeResponse;
  json: (body: unknown, init?: ResponseInit) => NextLikeResponse;
}

interface NextLikeResponse extends Response {
  readonly headers: Headers;
}

let _NextResponse: NextLikeResponseStatic | null = null;

async function getNextResponse(): Promise<NextLikeResponseStatic> {
  if (_NextResponse) return _NextResponse;
  const mod = (await import("next/server")) as { NextResponse: NextLikeResponseStatic };
  _NextResponse = mod.NextResponse;
  return _NextResponse;
}

export type DualmarkMiddleware = (request: NextLikeRequest) => Promise<Response>;

export function buildMatcherSource(internalNamespace: string): string {
  return `/((?!_next/|favicon.ico|${internalNamespace}/).*)`;
}

/**
 * Default matcher source for `internalNamespace: "md"`. Exported for testing
 * and runtime introspection only — Next.js parses `export const config`
 * statically and rejects non-literal expressions (including imported
 * identifiers), so in your `middleware.ts` you must inline the literal:
 *
 *     export const config = {
 *       matcher: [
 *         {
 *           source: "/((?!_next/|favicon.ico|md/).*)",
 *           missing: [{ type: "header", key: "next-router-prefetch" }],
 *         },
 *       ],
 *     };
 *
 * If you customize `internalNamespace`, replace `md/` accordingly.
 */
export const DUALMARK_DEFAULT_MATCHER_SOURCE = "/((?!_next/|favicon.ico|md/).*)";

export function toInternalMarkdownPath(pathname: string, internalNamespace: string): string {
  const stripped = pathname.replace(/\.md$/, "").replace(/\/+$/, "");
  if (stripped === "" || stripped === "/") return `/${internalNamespace}/index`;
  return `/${internalNamespace}${stripped}`;
}

function shouldSkip(
  pathname: string,
  internalNamespace: string,
  skipPaths: ReadonlyArray<string>,
): boolean {
  if (pathname === "/llms.txt") return true;
  if (pathname.startsWith(`/${internalNamespace}/`)) return true;
  if (pathname.startsWith("/_next/") || pathname === "/favicon.ico") return true;
  for (const skip of skipPaths) {
    if (pathname === skip || pathname.startsWith(skip.endsWith("/") ? skip : `${skip}/`)) {
      return true;
    }
  }
  return false;
}

function appendVaryAccept(headers: Headers): void {
  const existing = headers.get("Vary");
  if (!existing) {
    headers.set("Vary", "Accept");
    return;
  }
  const tokens = existing.split(",").map((s) => s.trim().toLowerCase());
  if (!tokens.includes("accept")) {
    headers.set("Vary", `${existing}, Accept`);
  }
}

export function createDualmarkMiddleware(input: DualmarkNextConfig): DualmarkMiddleware {
  const resolved = resolveConfig(input);
  return async (request: NextLikeRequest): Promise<Response> => {
    const NextResponse = await getNextResponse();
    return handleRequest(request, NextResponse, resolved);
  };
}

export function handleRequest(
  request: NextLikeRequest,
  NextResponse: NextLikeResponseStatic,
  resolved: ResolvedDualmarkNextConfig,
): Response {
  const { pathname } = request.nextUrl;
  const { internalNamespace } = resolved;
  const skipPaths = resolved.middleware.skipPaths;

  if (shouldSkip(pathname, internalNamespace, skipPaths)) {
    return NextResponse.next();
  }

  if (pathname.endsWith(".md")) {
    const url = request.nextUrl.clone();
    url.pathname = toInternalMarkdownPath(pathname, internalNamespace);
    return NextResponse.rewrite(url);
  }

  const ua = request.headers.get("user-agent") ?? "";
  const accept = request.headers.get("accept") ?? "";
  const bot = detectAIBot(ua);
  const fmt = negotiateFormat(accept);

  if (bot.isBot || fmt === "markdown") {
    const url = request.nextUrl.clone();
    url.pathname = toInternalMarkdownPath(pathname, internalNamespace);
    return NextResponse.rewrite(url);
  }

  if (fmt === null && accept) {
    return new Response(
      "Not Acceptable\n\nSupported: text/html, text/markdown\n",
      {
        status: 406,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          Vary: "Accept",
        },
      },
    );
  }

  const res = NextResponse.next();
  if (resolved.middleware.injectLinkHeader) {
    const mdPath = toMarkdownPath(pathname);
    const link = `<${mdPath}>; rel="alternate"; type="text/markdown"`;
    const existing = res.headers.get("Link");
    res.headers.set("Link", existing ? `${existing}, ${link}` : link);
    appendVaryAccept(res.headers);
  }
  return res;
}
