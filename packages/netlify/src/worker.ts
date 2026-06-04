import {
  detectAIBot,
  estimateTokens,
  negotiateFormat,
  toMarkdownPath,
} from "@dualmark/core";
import type {
  AIRequestInfo,
  AssetsFetcher,
  CreateAEOWorkerOptions,
  MissInfo,
  NetlifyContext,
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
const SUBREQUEST_HEADER = "x-dualmark-subrequest";

const defaultAssets: AssetsFetcher = {
  fetch: (req, init) => {
    const url = req instanceof URL ? req : new URL(req);
    return fetch(url.href, init);
  },
};

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

async function fetchMd(
  assets: AssetsFetcher,
  origin: string,
  mdPathname: string,
  subrequestHeader?: RequestInit
): Promise<Response | null> {
  try {
    const res = await assets.fetch(new URL(mdPathname, origin), subrequestHeader);
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

/**
 * Creates a Netlify Edge Function worker that transparently serves
 * pre-built `.md` files to AI bots while passing all other traffic through
 * to `context.next()`.
 */
export function createAEOWorker(
  options: CreateAEOWorkerOptions = {},
): (request: Request, context: NetlifyContext) => Promise<Response> {
  const skipPrefixes = options.skip?.prefixes ?? DEFAULT_SKIP_PREFIXES;
  const skipExtensions = options.skip?.extensions ?? DEFAULT_ASSET_EXTENSIONS;
  const internalRedirects = options.redirects?.internal ?? {};
  const externalRedirects = options.redirects?.external ?? {};
  const trailingSlash = options.trailingSlash ?? "never";
  const cacheControl = options.headers?.cacheControl ?? DEFAULT_CACHE_CONTROL;
  const enableLinkHeader = options.enableLinkHeader !== false;
  const assets = options.assets ?? defaultAssets;

  const onAIRequest = options.hooks?.onAIRequest;
  const onMiss = options.hooks?.onMiss;

  return async function aeoWorker(
    request: Request,
    context: NetlifyContext,
  ): Promise<Response> {
    // Subrequest passthrough - prevents infinite loops when fetchAsset
    // calls fetch() to the same origin.
    if (request.headers.get(SUBREQUEST_HEADER)) {
      return context.next();
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

    const subrequestHeader: RequestInit = {
      headers: { [SUBREQUEST_HEADER]: "1" },
    };

    if (pathname.endsWith(".md") && !shouldSkip(pathname, skipPrefixes, skipExtensions)) {
      const originRes = await fetchMd(assets, url.origin, pathname, subrequestHeader);
      if (!originRes) {
        return new Response("Not Found", { status: 404 });
      }
      const body = await originRes.text();
      const tokens = estimateTokens(body);
      return new Response(body, {
        status: 200,
        headers: buildMarkdownHeaders(tokens, cacheControl),
      });
    }

    if (!shouldSkip(pathname, skipPrefixes, skipExtensions)) {
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

      if (bot.isBot || fmt === "markdown") {
        const mdPathname = toMarkdownPath(pathname);
        const assetRes = await fetchMd(assets, url.origin, mdPathname, subrequestHeader);

        if (assetRes) {
          const body = await assetRes.text();
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
          if (onAIRequest) context.waitUntil(Promise.resolve(onAIRequest(info)));
          return new Response(body, {
            status: 200,
            headers: buildMarkdownHeaders(tokens, cacheControl),
          });
        }

        const cleanPath = normalizePath(pathname);
        const internalTarget = internalRedirects[cleanPath];
        if (internalTarget) {
          const targetRes = await fetchMd(assets, url.origin, toMarkdownPath(internalTarget), subrequestHeader);
          if (targetRes) {
            const body = await targetRes.text();
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
            if (onAIRequest) context.waitUntil(Promise.resolve(onAIRequest(info)));
            return new Response(body, {
              status: 200,
              headers: buildMarkdownHeaders(tokens, cacheControl, cleanPath, internalTarget)
            });
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
          if (onAIRequest) context.waitUntil(Promise.resolve(onAIRequest(info)));
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
        if (onMiss) context.waitUntil(Promise.resolve(onMiss(missInfo)));
      }
    }

    const originResponse = await context.next();

    if (
      enableLinkHeader &&
      !shouldSkip(pathname, skipPrefixes, skipExtensions) &&
      !pathname.endsWith(".md") &&
      originResponse.headers.get("content-type")?.includes("text/html")
    ) {
      const mdPath = toMarkdownPath(pathname);
      const newHeaders = new Headers(originResponse.headers);
      const link = `<${mdPath}>; rel="alternate"; type="text/markdown"`;
      const existing = newHeaders.get("Link");
      newHeaders.set("Link", existing ? `${existing}, ${link}` : link);
      const vary = newHeaders.get("Vary");
      if (!vary) {
        newHeaders.set("Vary", "Accept");
      } else if (!vary.split(",").map((s) => s.trim().toLowerCase()).includes("accept")) {
        newHeaders.set("Vary", `${vary}, Accept`);
      }
      return new Response(originResponse.body, {
        status: originResponse.status,
        statusText: originResponse.statusText,
        headers: newHeaders,
      });
    }

    return originResponse;
  };
}
