export interface ParsedMediaType {
  type: string;
  subtype: string;
  quality: number;
}

export function parseAcceptHeader(header: string): ParsedMediaType[] {
  if (!header) return [];
  return header
    .split(",")
    .map((range) => {
      const [mediaType, ...params] = range.trim().split(";");
      const [type = "*", subtype = "*"] = (mediaType ?? "").trim().split("/");
      let quality = 1.0;
      for (const param of params) {
        const [key, value] = param.trim().split("=");
        if (key?.trim() === "q") {
          quality = Math.min(1.0, Math.max(0, parseFloat(value ?? "0") || 0));
        }
      }
      return {
        type: (type ?? "*").toLowerCase(),
        subtype: (subtype ?? "*").toLowerCase(),
        quality,
      };
    })
    .sort((a, b) => {
      if (b.quality !== a.quality) return b.quality - a.quality;
      const specA = (a.type === "*" ? 0 : 1) + (a.subtype === "*" ? 0 : 1);
      const specB = (b.type === "*" ? 0 : 1) + (b.subtype === "*" ? 0 : 1);
      return specB - specA;
    });
}

export function mediaTypeMatches(
  pref: ParsedMediaType,
  type: string,
  subtype: string,
): boolean {
  if (pref.quality === 0) return false;
  if (pref.type !== "*" && pref.type !== type) return false;
  if (pref.subtype !== "*" && pref.subtype !== subtype) return false;
  return true;
}

const FORMAT_REGISTRY = new Map<string, ReadonlyArray<readonly [string, string]>>([
  [
    "html",
    [
      ["text", "html"],
      ["application", "xhtml+xml"],
    ],
  ],
  ["markdown", [["text", "markdown"]]],
]);

export function registerFormat(
  key: string,
  mediaTypes: ReadonlyArray<readonly [string, string]>,
): void {
  FORMAT_REGISTRY.set(key, mediaTypes);
}

export function getRegisteredFormats(): ReadonlyArray<string> {
  return Array.from(FORMAT_REGISTRY.keys());
}

const DEFAULT_AVAILABLE = ["html", "markdown"] as const;

export function negotiateFormat<T extends string = "html" | "markdown">(
  accept: string,
  available?: ReadonlyArray<T>,
): T | null {
  const formats = (available ?? (DEFAULT_AVAILABLE as ReadonlyArray<unknown> as ReadonlyArray<T>));
  if (formats.length === 0) return null;

  const prefs = parseAcceptHeader(accept);
  if (prefs.length === 0) return formats[0] ?? null;

  const formatQ = new Map<T, number>();
  for (const fmt of formats) formatQ.set(fmt, -1);

  for (const pref of prefs) {
    for (const fmt of formats) {
      if ((formatQ.get(fmt) ?? -1) >= 0) continue;
      const mediaTypes = FORMAT_REGISTRY.get(fmt);
      if (!mediaTypes) continue;
      for (const [type, subtype] of mediaTypes) {
        if (mediaTypeMatches(pref, type, subtype)) {
          formatQ.set(fmt, pref.quality);
          break;
        }
      }
    }
  }

  for (const fmt of formats) {
    if ((formatQ.get(fmt) ?? -1) >= 0) continue;
    const mediaTypes = FORMAT_REGISTRY.get(fmt);
    if (!mediaTypes) continue;
    const primaryType = mediaTypes[0]?.[0];
    for (const pref of prefs) {
      if (
        pref.type === "*" ||
        (primaryType !== undefined && pref.type === primaryType && pref.subtype === "*")
      ) {
        formatQ.set(fmt, pref.quality);
        break;
      }
    }
  }

  let best: { fmt: T; q: number; idx: number } | null = null;
  formats.forEach((fmt, idx) => {
    const q = formatQ.get(fmt) ?? -1;
    if (q <= 0) return;
    if (
      best === null ||
      q > best.q ||
      (q === best.q && idx < best.idx)
    ) {
      best = { fmt, q, idx };
    }
  });

  return best === null ? null : (best as { fmt: T; q: number; idx: number }).fmt;
}

/**
 * Decide whether a request should be served the markdown twin instead of HTML.
 *
 * This encodes the AEO spec §5 rule for UA-based markdown: a known AI bot MAY
 * receive markdown, but "UA detection MUST NOT override an explicit `Accept`".
 * Markdown is served when either:
 *
 *   1. RFC 7231 negotiation on the `Accept` header already picks markdown, or
 *   2. the request is from a known AI bot AND markdown is at least as
 *      acceptable as HTML for that `Accept` header.
 *
 * Case 2 is checked by negotiating with markdown listed first, so a tie (a
 * wildcard Accept, or no Accept at all) resolves to markdown for bots, while an
 * explicit `Accept: text/html` (where HTML strictly outranks markdown, or
 * markdown is not acceptable at all) keeps the bot on HTML.
 */
export function shouldServeMarkdown(accept: string, isBot: boolean): boolean {
  if (negotiateFormat(accept) === "markdown") return true;
  if (!isBot) return false;
  return negotiateFormat(accept, ["markdown", "html"]) === "markdown";
}
