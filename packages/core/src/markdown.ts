import { normalizeUnicode } from "./text.js";
import { estimateTokens, type TokenEstimator } from "./tokens.js";

export interface MarkdownResponseOptions {
  cacheControl?: string;
  noindex?: boolean;
  redirectFrom?: string;
  redirectTo?: string;
  extraHeaders?: HeadersInit;
  status?: number;
  tokenizer?: TokenEstimator;
}

const DEFAULT_CACHE_CONTROL = "public, max-age=3600";

export function markdownResponse(
  body: string,
  options: MarkdownResponseOptions = {},
): Response {
  const normalized = normalizeUnicode(body);
  const tokens = estimateTokens(normalized, { tokenizer: options.tokenizer });

  const headers = new Headers({
    "Content-Type": "text/markdown; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "X-Markdown-Tokens": String(tokens),
    "Vary": "Accept",
    "Cache-Control": options.cacheControl ?? DEFAULT_CACHE_CONTROL,
    "X-AEO-Version": "1.0",
  });

  if (options.noindex !== false) {
    headers.set("X-Robots-Tag", "noindex");
  }

  if (options.redirectFrom) headers.set("X-Redirect-From", options.redirectFrom);
  if (options.redirectTo) headers.set("X-Redirect-To", options.redirectTo);

  if (options.extraHeaders) {
    const extra = new Headers(options.extraHeaders);
    extra.forEach((value, key) => headers.set(key, value));
  }

  return new Response(normalized, {
    status: options.status ?? 200,
    headers,
  });
}

export function injectMarkdownAlternateLink(
  response: Response,
  htmlUrl: string,
  mdUrl: string,
): Response {
  const headers = new Headers(response.headers);
  const link = `<${mdUrl}>; rel="alternate"; type="text/markdown"`;
  const existing = headers.get("Link");
  headers.set("Link", existing ? `${existing}, ${link}` : link);
  const vary = headers.get("Vary");
  if (!vary) {
    headers.set("Vary", "Accept");
  } else if (!vary.split(",").map((s) => s.trim().toLowerCase()).includes("accept")) {
    headers.set("Vary", `${vary}, Accept`);
  }
  void htmlUrl;
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function renderLinkAlternateHeader(htmlUrl: string, mdUrl: string): string {
  void htmlUrl;
  return `<${mdUrl}>; rel="alternate"; type="text/markdown"`;
}
