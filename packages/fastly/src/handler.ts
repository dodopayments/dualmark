import {
  detectAIBot,
  estimateTokens,
  negotiateFormat,
  toMarkdownPath,
} from "@dualmark/core";
import type {
  AEOFetchEventHandler,
  AEORequestHandler,
  AIRequestInfo,
  CreateAEORequestHandlerOptions,
  FastlyBackendFetchInit,
  FastlyFetch,
  MinimalFetchEvent,
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
  return prefixes.some((prefix) => pathname.startsWith(prefix));
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

function resolveFetch(fetcher?: FastlyFetch): FastlyFetch {
  if (fetcher) return fetcher;
  return async (request, init) => fetch(request, init);
}

function withBackend(request: Request, backend: string, url?: URL): [Request, FastlyBackendFetchInit] {
  const target = url
    ? new Request(url, {
        method: request.method,
        headers: request.headers,
      })
    : request;
  return [target, { backend }];
}

function withVaryAccept(headers: Headers): void {
  const vary = headers.get("Vary");
  if (!vary) {
    headers.set("Vary", "Accept");
    return;
  }
  const tokens = vary.split(",").map((value) => value.trim().toLowerCase());
  if (!tokens.includes("accept")) {
    headers.set("Vary", `${vary}, Accept`);
  }
}

async function asMarkdownResponse(
  upstreamResponse: Response,
  cacheControl: string,
  redirectFrom?: string,
  redirectTo?: string,
): Promise<Response> {
  const body = await upstreamResponse.text();
  return new Response(body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: buildMarkdownHeaders(body, cacheControl, redirectFrom, redirectTo),
  });
}

export function createAEORequestHandler(
  options: CreateAEORequestHandlerOptions,
): AEORequestHandler {
  const fetcher = resolveFetch(options.fetcher);
  const skipPrefixes = options.skip?.prefixes ?? DEFAULT_SKIP_PREFIXES;
  const skipExtensions = options.skip?.extensions ?? DEFAULT_ASSET_EXTENSIONS;
  const internalRedirects = options.redirects?.internal ?? {};
  const externalRedirects = options.redirects?.external ?? {};
  const trailingSlash = options.trailingSlash ?? "never";
  const cacheControl = options.headers?.cacheControl ?? DEFAULT_CACHE_CONTROL;
  const enableLinkHeader = options.enableLinkHeader !== false;
  const onAIRequest = options.hooks?.onAIRequest;
  const onMiss = options.hooks?.onMiss;
  const markdownBackend = options.markdownBackend ?? options.backend;

  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method !== "GET" && request.method !== "HEAD") {
      const [upstreamRequest, upstreamInit] = withBackend(request, options.backend);
      return fetcher(upstreamRequest, upstreamInit);
    }

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
      return new Response(null, {
        status: 301,
        headers: { Location: target.href },
      });
    }

    if (pathname.endsWith(".md") && !shouldSkip(pathname, skipPrefixes, skipExtensions)) {
      const [markdownRequest, markdownInit] = withBackend(request, markdownBackend);
      const markdownResponse = await fetcher(markdownRequest, markdownInit);
      if (!markdownResponse.ok) return markdownResponse;
      return asMarkdownResponse(markdownResponse, cacheControl);
    }

    if (!pathname.endsWith(".md") && !shouldSkip(pathname, skipPrefixes, skipExtensions)) {
      const accept = request.headers.get("accept") ?? "";
      const ua = request.headers.get("user-agent") ?? "";
      const bot = detectAIBot(ua);
      const format = negotiateFormat(accept);

      if (format === null && accept) {
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

      if (bot.isBot || format === "markdown") {
        const markdownUrl = new URL(url);
        markdownUrl.pathname = toMarkdownPath(pathname);
        const [markdownRequest, markdownInit] = withBackend(
          request,
          markdownBackend,
          markdownUrl,
        );
        const markdownResponse = await fetcher(markdownRequest, markdownInit);

        if (markdownResponse.ok) {
          const markdown = await markdownResponse.text();
          const tokens = estimateTokens(markdown);
          const info: AIRequestInfo = {
            url,
            botName: bot.name,
            botVendor: bot.vendor,
            acceptHeader: accept,
            pathname,
            cacheStatus: "hit",
            tokens,
          };
          if (onAIRequest) await Promise.resolve(onAIRequest(info));
          return new Response(markdown, {
            status: markdownResponse.status,
            statusText: markdownResponse.statusText,
            headers: buildMarkdownHeaders(markdown, cacheControl),
          });
        }

        const cleanPath = normalizePath(pathname);
        const internalTarget = internalRedirects[cleanPath];
        if (internalTarget) {
          const targetUrl = new URL(url);
          targetUrl.pathname = toMarkdownPath(internalTarget);
          const [targetRequest, targetInit] = withBackend(request, markdownBackend, targetUrl);
          const targetResponse = await fetcher(targetRequest, targetInit);
          if (targetResponse.ok) {
            const markdown = await targetResponse.text();
            const tokens = estimateTokens(markdown);
            const info: AIRequestInfo = {
              url,
              botName: bot.name,
              botVendor: bot.vendor,
              acceptHeader: accept,
              pathname,
              cacheStatus: "hit",
              tokens,
            };
            if (onAIRequest) await Promise.resolve(onAIRequest(info));
            return new Response(markdown, {
              status: targetResponse.status,
              statusText: targetResponse.statusText,
              headers: buildMarkdownHeaders(markdown, cacheControl, cleanPath, internalTarget),
            });
          }
        }

        const externalTarget = externalRedirects[cleanPath];
        if (externalTarget) {
          const markdown =
            `# Redirect\n\nThis page has moved to an external location.\n\n- **Redirect**: [${externalTarget}](${externalTarget})\n`;
          const tokens = estimateTokens(markdown);
          const info: AIRequestInfo = {
            url,
            botName: bot.name,
            botVendor: bot.vendor,
            acceptHeader: accept,
            pathname,
            cacheStatus: "hit",
            tokens,
          };
          if (onAIRequest) await Promise.resolve(onAIRequest(info));
          return new Response(markdown, {
            status: 200,
            headers: buildMarkdownHeaders(markdown, cacheControl, cleanPath, externalTarget),
          });
        }

        const missInfo: MissInfo = {
          url,
          botName: bot.name,
          pathname,
          acceptHeader: accept,
        };
        if (onMiss) await Promise.resolve(onMiss(missInfo));
      }
    }

    const [upstreamRequest, upstreamInit] = withBackend(request, options.backend);
    const upstreamResponse = await fetcher(upstreamRequest, upstreamInit);

    if (
      enableLinkHeader &&
      !shouldSkip(pathname, skipPrefixes, skipExtensions) &&
      !pathname.endsWith(".md") &&
      upstreamResponse.headers.get("content-type")?.includes("text/html")
    ) {
      const headers = new Headers(upstreamResponse.headers);
      const link = `<${toMarkdownPath(pathname)}>; rel="alternate"; type="text/markdown"`;
      const existing = headers.get("Link");
      headers.set("Link", existing ? `${existing}, ${link}` : link);
      withVaryAccept(headers);
      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers,
      });
    }

    return upstreamResponse;
  };
}

export function createAEOFetchEventHandler(
  options: CreateAEORequestHandlerOptions,
): AEOFetchEventHandler {
  const handleRequest = createAEORequestHandler(options);
  return (event: MinimalFetchEvent): void => {
    event.respondWith(handleRequest(event.request));
  };
}
