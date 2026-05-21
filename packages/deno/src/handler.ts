import {
  detectAIBot,
  estimateTokens,
  negotiateFormat,
  toMarkdownPath,
} from "@dualmark/core";
import type {
  AEODenoHandler,
  AIRequestInfo,
  CreateAEOHandlerOptions,
  DenoServeHandlerInfo,
  MissInfo,
} from "./types.js";

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

function shouldSkip(
  pathname: string,
  prefixes: ReadonlyArray<string>,
  extensions: ReadonlyArray<string>,
): boolean {
  if (extensions.some((ext) => pathname.endsWith(ext))) return true;
  return prefixes.some((p) => {
    if (pathname === p) return true;
    if (p.endsWith("/")) return pathname.startsWith(p);
    return pathname.startsWith(p + "/");
  });
}

function normalizePath(pathname: string): string {
  return pathname.replace(/\/$/, "") || "/";
}

function buildMarkdownHeaders(
  tokens: number,
  cacheControl: string,
  redirectFrom?: string,
  redirectTo?: string,
): Headers {
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

function scheduleHook<T>(
  info: DenoServeHandlerInfo,
  hook: ((arg: T) => void | Promise<void>) | undefined,
  arg: T,
): void {
  if (!hook) return;
  const logError = (err: unknown) => {
    console.error("[@dualmark/deno] hook error:", err);
  };
  if (info.completed) {
    info.completed.then(() => hook(arg)).catch(logError);
  } else {
    Promise.resolve().then(() => hook(arg)).catch(logError);
  }
}

export function createAEOHandler(options: CreateAEOHandlerOptions): AEODenoHandler {
  const skipPrefixes = options.skip?.prefixes ?? DEFAULT_SKIP_PREFIXES;
  const skipExtensions = options.skip?.extensions ?? DEFAULT_ASSET_EXTENSIONS;
  const internalRedirects = options.redirects?.internal ?? {};
  const externalRedirects = options.redirects?.external ?? {};
  const trailingSlash = options.trailingSlash ?? "never";
  const cacheControl = options.headers?.cacheControl ?? DEFAULT_CACHE_CONTROL;
  const enableLinkHeader = options.enableLinkHeader !== false;

  const onAIRequest = options.hooks?.onAIRequest;
  const onMiss = options.hooks?.onMiss;

  return async function handler(request, info): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const isSafeMethod = request.method === "GET" || request.method === "HEAD";

    if (
      isSafeMethod &&
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
      isSafeMethod &&
      trailingSlash === "always" &&
      pathname !== "/" &&
      !pathname.endsWith("/") &&
      !pathname.endsWith(".md") &&
      !shouldSkip(pathname, skipPrefixes, skipExtensions)
    ) {
      const target = new URL(pathname + "/" + url.search, url.origin);
      return new Response(null, { status: 301, headers: { Location: target.href } });
    }

    if (isSafeMethod && pathname.endsWith(".md") && !shouldSkip(pathname, skipPrefixes, skipExtensions)) {
      let assetResponse: Response | null = null;
      try {
        assetResponse = await options.upstream(request, info);
      } catch {
        assetResponse = null;
      }
      if (assetResponse && assetResponse.ok) {
        const body = await assetResponse.text();
        const tokens = estimateTokens(body);
        return new Response(body, {
          status: 200,
          headers: buildMarkdownHeaders(tokens, cacheControl),
        });
      }
      return assetResponse ?? new Response("Not Found", { status: 404 });
    }

    if (isSafeMethod && !pathname.endsWith(".md") && !shouldSkip(pathname, skipPrefixes, skipExtensions)) {
      const ua = request.headers.get("user-agent") ?? "";
      const accept = request.headers.get("accept") ?? "";
      const bot = detectAIBot(ua);
      const fmt = negotiateFormat(accept);

      if (fmt === null && accept) {
        return new Response(
          "Not Acceptable\n\nSupported types: text/html, text/markdown\n",
          {
            status: 406,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              Vary: "Accept",
            },
          },
        );
      }

      const serveMarkdown = bot.isBot || fmt === "markdown";

      if (serveMarkdown) {
        const mdPath = toMarkdownPath(pathname);
        // Reconstruct the request with headers only (no method/body). This branch is gated
        // by `isSafeMethod` above, so the original request is GET/HEAD and has no body to
        // preserve. Avoiding the full request copy also prevents stream-consumption issues
        // if a refactor ever lets a body-bearing method reach this point.
        const mdRequest = new Request(new URL(mdPath + url.search, url.origin), {
          headers: request.headers,
        });
        let assetResponse: Response | null = null;
        try {
          assetResponse = await options.upstream(mdRequest, info);
        } catch {
          assetResponse = null;
        }

        if (assetResponse && assetResponse.ok) {
          const body = await assetResponse.text();
          const tokens = estimateTokens(body);
          const aiInfo: AIRequestInfo = {
            url,
            botName: bot.name,
            botVendor: bot.vendor,
            acceptHeader: accept,
            pathname,
            cacheStatus: "hit",
            tokens,
          };
          scheduleHook(info, onAIRequest, aiInfo);
          return new Response(body, {
            status: 200,
            headers: buildMarkdownHeaders(tokens, cacheControl),
          });
        }

        const cleanPath = normalizePath(pathname);
        const internalTarget = internalRedirects[cleanPath];
        if (internalTarget) {
          const targetMd = toMarkdownPath(internalTarget);
          const targetReq = new Request(new URL(targetMd + url.search, url.origin), {
            headers: request.headers,
          });
          try {
            const targetResp = await options.upstream(targetReq, info);
            if (targetResp.ok) {
              const body = await targetResp.text();
              const tokens = estimateTokens(body);
              const aiInfo: AIRequestInfo = {
                url,
                botName: bot.name,
                botVendor: bot.vendor,
                acceptHeader: accept,
                pathname,
                cacheStatus: "hit",
                tokens,
              };
              scheduleHook(info, onAIRequest, aiInfo);
              return new Response(body, {
                status: 200,
                headers: buildMarkdownHeaders(tokens, cacheControl, cleanPath, internalTarget),
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
          const aiInfo: AIRequestInfo = {
            url,
            botName: bot.name,
            botVendor: bot.vendor,
            acceptHeader: accept,
            pathname,
            cacheStatus: "hit",
            tokens,
          };
          scheduleHook(info, onAIRequest, aiInfo);
          return new Response(body, {
            status: 200,
            headers: buildMarkdownHeaders(tokens, cacheControl, cleanPath, externalTarget),
          });
        }

        const missInfo: MissInfo = {
          url,
          botName: bot.name,
          pathname,
          acceptHeader: accept,
        };
        scheduleHook(info, onMiss, missInfo);
      }
    }

    // Bot/markdown miss falls through here so upstream renders HTML for the original URL.
    // This intentionally calls upstream a second time on the markdown-miss path
    // the first call (with the synthetic .md request) is gated to GET/HEAD and discarded above.
    const upstreamResponse = await options.upstream(request, info);

    if (
      !shouldSkip(pathname, skipPrefixes, skipExtensions) &&
      !pathname.endsWith(".md") &&
      upstreamResponse.headers.get("content-type")?.includes("text/html")
    ) {
      const newHeaders = new Headers(upstreamResponse.headers);
      const vary = newHeaders.get("Vary");
      if (!vary) {
        newHeaders.set("Vary", "Accept");
      } else if (!vary.split(",").map((s) => s.trim().toLowerCase()).includes("accept")) {
        newHeaders.set("Vary", `${vary}, Accept`);
      }

      if (enableLinkHeader) {
        const mdPath = toMarkdownPath(pathname);
        const link = `<${mdPath}>; rel="alternate"; type="text/markdown"`;
        const existing = newHeaders.get("Link");
        newHeaders.set("Link", existing ? `${existing}, ${link}` : link);
      }

      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: newHeaders,
      });
    }

    return upstreamResponse;
  };
}
