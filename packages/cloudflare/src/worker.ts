import {
  detectAIBot,
  estimateTokens,
  negotiateFormat,
  toMarkdownPath,
} from "@dualmark/core";
import type {
  AIRequestInfo,
  AnalyticsEngineDataset,
  CreateAEOWorkerOptions,
  MinimalEnv,
  MinimalExecutionContext,
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
  return prefixes.some((p) => pathname.startsWith(p));
}

function normalizePath(pathname: string): string {
  return pathname.replace(/\/$/, "") || "/";
}

function buildMarkdownHeaders(
  body: string,
  cacheControl: string,
  tokenizer?: (text: string) => number,
  redirectFrom?: string,
  redirectTo?: string,
): Headers {
  const tokens = estimateTokens(body, { tokenizer });
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

function trackAnalytics(
  env: MinimalEnv,
  bindingName: string | undefined,
  info: AIRequestInfo,
  request: Request,
): void {
  if (!bindingName) return;
  const ds = env[bindingName] as AnalyticsEngineDataset | undefined;
  if (!ds || typeof ds.writeDataPoint !== "function") return;
  const indexKey = info.botName ?? "accept:text/markdown";
  const ua = (request.headers.get("user-agent") ?? "unknown").slice(0, 256);
  const country =
    (request.headers.get("cf-ipcountry") as string | null) ?? "unknown";
  ds.writeDataPoint({
    indexes: [indexKey],
    blobs: [indexKey, info.pathname, country, info.cacheStatus, ua],
    doubles: [info.tokens, 1],
  });
}

export function createAEOWorker<Env extends MinimalEnv = MinimalEnv>(
  options: CreateAEOWorkerOptions<Env>,
): { fetch: (req: Request, env: Env, ctx: MinimalExecutionContext) => Promise<Response> } {
  const skipPrefixes = options.skip?.prefixes ?? DEFAULT_SKIP_PREFIXES;
  const skipExtensions = options.skip?.extensions ?? DEFAULT_ASSET_EXTENSIONS;
  const internalRedirects = options.redirects?.internal ?? {};
  const externalRedirects = options.redirects?.external ?? {};
  const trailingSlash = options.trailingSlash ?? "never";
  const cacheControl = options.headers?.cacheControl ?? DEFAULT_CACHE_CONTROL;
  const analyticsBinding = options.analytics?.binding;
  const enableLinkHeader = options.enableLinkHeader !== false;
  const tokenizer = options.tokenizer;

  const onAIRequest = options.hooks?.onAIRequest;
  const onMiss = options.hooks?.onMiss;

  return {
    async fetch(request, env, ctx): Promise<Response> {
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

      if (pathname.endsWith(".md") && !shouldSkip(pathname, skipPrefixes, skipExtensions)) {
        let assetResponse: Response | null = null;
        try {
          assetResponse = await env.ASSETS.fetch(new URL(pathname, url.origin));
        } catch {
          assetResponse = null;
        }
        if (assetResponse && assetResponse.ok) {
          const body = await assetResponse.text();
          return new Response(body, {
            status: 200,
            headers: buildMarkdownHeaders(body, cacheControl, tokenizer),
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
          const assetUrl = new URL(mdPath, url.origin);
          let assetResponse: Response | null = null;
          try {
            assetResponse = await env.ASSETS.fetch(assetUrl);
          } catch {
            assetResponse = null;
          }

          if (assetResponse && assetResponse.ok) {
            const body = await assetResponse.text();
            const tokens = estimateTokens(body, { tokenizer });
            const info: AIRequestInfo = {
              url,
              botName: bot.name,
              botVendor: bot.vendor,
              acceptHeader: accept,
              pathname,
              cacheStatus: "hit",
              tokens,
            };
            trackAnalytics(env, analyticsBinding, info, request);
            if (onAIRequest) ctx.waitUntil(Promise.resolve(onAIRequest(info)));
            return new Response(body, {
              status: 200,
              headers: buildMarkdownHeaders(body, cacheControl, tokenizer),
            });
          }

          const cleanPath = normalizePath(pathname);
          const internalTarget = internalRedirects[cleanPath];
          if (internalTarget) {
            const targetMd = toMarkdownPath(internalTarget);
            try {
              const targetResp = await env.ASSETS.fetch(new URL(targetMd, url.origin));
              if (targetResp.ok) {
                const body = await targetResp.text();
                const tokens = estimateTokens(body, { tokenizer });
                const info: AIRequestInfo = {
                  url,
                  botName: bot.name,
                  botVendor: bot.vendor,
                  acceptHeader: accept,
                  pathname,
                  cacheStatus: "hit",
                  tokens,
                };
                trackAnalytics(env, analyticsBinding, info, request);
                if (onAIRequest) ctx.waitUntil(Promise.resolve(onAIRequest(info)));
                return new Response(body, {
                  status: 200,
                  headers: buildMarkdownHeaders(body, cacheControl, tokenizer, cleanPath, internalTarget),
                });
              }
            } catch {
              // fall through to external check
            }
          }

          const externalTarget = externalRedirects[cleanPath];
          if (externalTarget) {
            const body = `# Redirect\n\nThis page has moved to an external location.\n\n- **Redirect**: [${externalTarget}](${externalTarget})\n`;
            const tokens = estimateTokens(body, { tokenizer });
            const info: AIRequestInfo = {
              url,
              botName: bot.name,
              botVendor: bot.vendor,
              acceptHeader: accept,
              pathname,
              cacheStatus: "hit",
              tokens,
            };
            trackAnalytics(env, analyticsBinding, info, request);
            if (onAIRequest) ctx.waitUntil(Promise.resolve(onAIRequest(info)));
            return new Response(body, {
              status: 200,
              headers: buildMarkdownHeaders(body, cacheControl, tokenizer, cleanPath, externalTarget),
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
          trackAnalytics(env, analyticsBinding, missAnalytics, request);
          if (onMiss) ctx.waitUntil(Promise.resolve(onMiss(missInfo)));
        }
      }

      const upstreamResponse = await options.upstream.fetch(request, env, ctx);

      if (
        enableLinkHeader &&
        !shouldSkip(pathname, skipPrefixes, skipExtensions) &&
        !pathname.endsWith(".md") &&
        upstreamResponse.headers.get("content-type")?.includes("text/html")
      ) {
        const mdPath = toMarkdownPath(pathname);
        const newHeaders = new Headers(upstreamResponse.headers);
        const link = `<${mdPath}>; rel="alternate"; type="text/markdown"`;
        const existing = newHeaders.get("Link");
        newHeaders.set("Link", existing ? `${existing}, ${link}` : link);
        const vary = newHeaders.get("Vary");
        if (!vary) {
          newHeaders.set("Vary", "Accept");
        } else if (!vary.split(",").map((s) => s.trim().toLowerCase()).includes("accept")) {
          newHeaders.set("Vary", `${vary}, Accept`);
        }
        return new Response(upstreamResponse.body, {
          status: upstreamResponse.status,
          statusText: upstreamResponse.statusText,
          headers: newHeaders,
        });
      }

      return upstreamResponse;
    },
  };
}
