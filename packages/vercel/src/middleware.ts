import { detectAIBot, estimateTokens, negotiateFormat, toMarkdownPath } from "@dualmark/core";
import type { AIRequestInfo, MissInfo } from "./types.js";
import type { CreateAEOMiddlewareOptions, VercelEdgeContext } from "./types.js";

const DEFAULT_SKIP_PREFIXES = ["/admin", "/api/", "/_"];
const DEFAULT_ASSET_EXTENSIONS = [
  ".js",
  ".css",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
  ".gif",
  ".ico",
  ".woff",
  ".woff2",
  ".xml",
  ".json",
  ".txt",
  ".pdf",
];

const DEFAULT_CACHE_CONTROL = "public, max-age=3600";
const SUBREQUEST_HEADER = "x-dualmark-subrequest";

interface NextLikeResponseStatic {
  next: () => Response;
}

// Cached at module init — one dynamic import at cold start, not per-request.
// Intentionally cached for edge runtime lifetime.
let _NextResponse: NextLikeResponseStatic | null = null;

async function getNextResponse(): Promise<NextLikeResponseStatic | null> {
  if (_NextResponse !== null) return _NextResponse;
  try {
    const mod = (await import("next/server")) as { NextResponse: NextLikeResponseStatic };
    _NextResponse = mod.NextResponse;
    return _NextResponse;
  } catch {
    _NextResponse = null;
    return null;
  }
}

function shouldSkip(
  pathname: string,
  prefixes: ReadonlyArray<string>,
  extensions: ReadonlyArray<string>,
): boolean {
  if (extensions.some((ext) => pathname.endsWith(ext))) return true;
  return prefixes.some((p) => pathname.startsWith(p));
}

function normalizePath(pathname: string): string {
  return pathname.replace(/\/$/, "") || "/";
}

function buildMarkdownHeaders(
  body: string,
  cacheControl: string,
  redirectFrom?: string,
  redirectTo?: string,
): Headers {
  const tokens = estimateTokens(body);
  const headers = new Headers({
    "Content-Type": "text/markdown; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex",
    "X-Markdown-Tokens": String(tokens),
    "X-AEO-Version": "1.0",
    "Cache-Control": cacheControl,
    Vary: "Accept",
  });
  if (redirectFrom) headers.set("X-Redirect-From", redirectFrom);
  if (redirectTo) headers.set("X-Redirect-To", redirectTo);
  return headers;
}

function appendLinkHeader(response: Response, mdPath: string): void {
  const link = `<${mdPath}>; rel="alternate"; type="text/markdown"`;
  const existing = response.headers.get("Link");
  response.headers.set("Link", existing ? `${existing}, ${link}` : link);
}

function appendVaryAccept(response: Response): void {
  const vary = response.headers.get("Vary");
  if (!vary) {
    response.headers.set("Vary", "Accept");
  } else if (
    !vary
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .includes("accept")
  ) {
    response.headers.set("Vary", `${vary}, Accept`);
  }
}

export function createAEOMiddleware(
  options: CreateAEOMiddlewareOptions,
): (request: Request, context?: VercelEdgeContext) => Promise<Response> {
  const skipPrefixes = options.skip?.prefixes ?? DEFAULT_SKIP_PREFIXES;
  const skipExtensions = options.skip?.extensions ?? DEFAULT_ASSET_EXTENSIONS;
  const internalRedirects = options.redirects?.internal ?? {};
  const externalRedirects = options.redirects?.external ?? {};
  const trailingSlash = options.trailingSlash ?? "never";
  const cacheControl = options.headers?.cacheControl ?? DEFAULT_CACHE_CONTROL;
  const enableLinkHeader = options.enableLinkHeader !== false;

  const onAIRequest = options.analytics?.onAIRequest;
  const onMiss = options.analytics?.onMiss;

  async function middleware(request: Request, context?: VercelEdgeContext): Promise<Response> {
    // Subrequest passthrough — prevents infinite loops when fetchAsset
    // calls fetch() to the same origin on Vercel.
    if (request.headers.get(SUBREQUEST_HEADER)) {
      const NextResponse = await getNextResponse();
      if (NextResponse) return NextResponse.next();
      return new Response(null, { status: 204 });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    if (
      trailingSlash === "never" &&
      pathname !== "/" &&
      pathname.endsWith("/") &&
      !shouldSkip(pathname, skipPrefixes, skipExtensions)
    ) {
      const clean = pathname.replace(/\/+$/, "");
      const target = new URL(clean + url.search, url.origin);
      return new Response(null, {
        status: 301,
        headers: { Location: target.href },
      });
    }
    if (
      trailingSlash === "always" &&
      pathname !== "/" &&
      !pathname.endsWith("/") &&
      !pathname.endsWith(".md") &&
      !shouldSkip(pathname, skipPrefixes, skipExtensions)
    ) {
      const target = new URL(pathname + "/" + url.search, url.origin);
      return new Response(null, { status: 301, headers: { Location: target.href } });
    }

    const subrequestInit: RequestInit = {
      headers: { [SUBREQUEST_HEADER]: "1" },
    };

    if (pathname.endsWith(".md") && !shouldSkip(pathname, skipPrefixes, skipExtensions)) {
      let assetResponse: Response | null = null;
      try {
        assetResponse = await options.fetchAsset(new URL(pathname, url.origin), subrequestInit);
      } catch {
        assetResponse = null;
      }
      if (assetResponse && assetResponse.ok) {
        const body = await assetResponse.text();
        return new Response(body, {
          status: 200,
          headers: buildMarkdownHeaders(body, cacheControl),
        });
      }
      return assetResponse ?? new Response("Not Found", { status: 404 });
    }

    if (!pathname.endsWith(".md") && !shouldSkip(pathname, skipPrefixes, skipExtensions)) {
      const ua = request.headers.get("user-agent") ?? "";
      const accept = request.headers.get("accept") ?? "";
      const bot = detectAIBot(ua);
      const fmt = negotiateFormat(accept);

      if (fmt === null && accept) {
        return new Response("Not Acceptable\n\nSupported types: text/html, text/markdown\n", {
          status: 406,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            Vary: "Accept",
          },
        });
      }

      const serveMarkdown = bot.isBot || fmt === "markdown";

      if (serveMarkdown) {
        const mdPath = toMarkdownPath(pathname);
        const assetUrl = new URL(mdPath, url.origin);
        let assetResponse: Response | null = null;
        try {
          assetResponse = await options.fetchAsset(assetUrl, subrequestInit);
        } catch {
          assetResponse = null;
        }

        if (assetResponse && assetResponse.ok) {
          const body = await assetResponse.text();
          const tokens = estimateTokens(body);
          const info: AIRequestInfo = {
            url,
            botName: bot.name,
            botVendor: bot.vendor,
            acceptHeader: accept,
            pathname,
            cacheStatus: "hit",
            tokens,
          };
          if (onAIRequest && context) context.waitUntil(Promise.resolve(onAIRequest(info)));
          else if (onAIRequest) onAIRequest(info);
          return new Response(body, {
            status: 200,
            headers: buildMarkdownHeaders(body, cacheControl),
          });
        }

        const cleanPath = normalizePath(pathname);
        const internalTarget = internalRedirects[cleanPath];
        if (internalTarget) {
          const targetMd = toMarkdownPath(internalTarget);
          try {
            const targetResp = await options.fetchAsset(
              new URL(targetMd, url.origin),
              subrequestInit,
            );
            if (targetResp.ok) {
              const body = await targetResp.text();
              const tokens = estimateTokens(body);
              const info: AIRequestInfo = {
                url,
                botName: bot.name,
                botVendor: bot.vendor,
                acceptHeader: accept,
                pathname,
                cacheStatus: "hit",
                tokens,
              };
              if (onAIRequest && context) context.waitUntil(Promise.resolve(onAIRequest(info)));
              else if (onAIRequest) onAIRequest(info);
              return new Response(body, {
                status: 200,
                headers: buildMarkdownHeaders(body, cacheControl, cleanPath, internalTarget),
              });
            }
          } catch {
            // fall through to external check
          }
        }

        const externalTarget = externalRedirects[cleanPath];
        if (externalTarget) {
          const body = `# Redirect\n\nThis page has moved to an external location.\n\n- **Redirect**: [${externalTarget}](${externalTarget})\n`;
          const tokens = estimateTokens(body);
          const info: AIRequestInfo = {
            url,
            botName: bot.name,
            botVendor: bot.vendor,
            acceptHeader: accept,
            pathname,
            cacheStatus: "hit",
            tokens,
          };
          if (onAIRequest && context) context.waitUntil(Promise.resolve(onAIRequest(info)));
          else if (onAIRequest) onAIRequest(info);
          return new Response(body, {
            status: 200,
            headers: buildMarkdownHeaders(body, cacheControl, cleanPath, externalTarget),
          });
        }

        const missInfo: MissInfo = {
          url,
          botName: bot.name,
          pathname,
          acceptHeader: accept,
        };
        const missAnalytics: AIRequestInfo = {
          url,
          botName: bot.name,
          botVendor: bot.vendor,
          acceptHeader: accept,
          pathname,
          cacheStatus: "miss",
          tokens: 0,
        };
        if (onAIRequest && context) context.waitUntil(Promise.resolve(onAIRequest(missAnalytics)));
        else if (onAIRequest) onAIRequest(missAnalytics);
        if (onMiss && context) context.waitUntil(Promise.resolve(onMiss(missInfo)));
        else if (onMiss) onMiss(missInfo);
      }
    }

    const upstreamResponse = await options.upstream(request);

    if (
      enableLinkHeader &&
      !shouldSkip(pathname, skipPrefixes, skipExtensions) &&
      !pathname.endsWith(".md")
    ) {
      const ct = upstreamResponse.headers.get("content-type");
      // Passthrough responses (e.g. NextResponse.next()) have no content-type yet —
      // always inject. For concrete responses, only inject on text/html.
      if (!ct || ct.includes("text/html")) {
        const mdPath = toMarkdownPath(pathname);
        try {
          // Fast path: mutate headers in-place (works for NextResponse.next() and
          // freshly constructed Response objects).
          appendLinkHeader(upstreamResponse, mdPath);
          appendVaryAccept(upstreamResponse);
        } catch {
          // Immutable headers (e.g. from fetch()) — clone into new Response.
          const newHeaders = new Headers(upstreamResponse.headers);
          const link = `<${mdPath}>; rel="alternate"; type="text/markdown"`;
          const existing = newHeaders.get("Link");
          newHeaders.set("Link", existing ? `${existing}, ${link}` : link);
          const vary = newHeaders.get("Vary");
          if (!vary) {
            newHeaders.set("Vary", "Accept");
          } else if (
            !vary
              .split(",")
              .map((s) => s.trim().toLowerCase())
              .includes("accept")
          ) {
            newHeaders.set("Vary", `${vary}, Accept`);
          }
          return new Response(upstreamResponse.body, {
            status: upstreamResponse.status,
            statusText: upstreamResponse.statusText,
            headers: newHeaders,
          });
        }
      }
    }

    return upstreamResponse;
  }

  return middleware;
}
