import { type VerifyReport, verifyUrl } from "@dualmark/cli";
import { NextResponse } from "next/server";
import { signSharePayload } from "@/lib/share-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 12_000;
const FRAMEWORK_TIMEOUT_MS = 5_000;
const MAX_URL_LENGTH = 2048;

type Level = "Advanced" | "Standard" | "Basic" | "Below Basic";
type Framework = "astro" | "next" | "cloudflare" | "unknown";

/**
 * Best-effort framework detection from response headers + HTML generator meta.
 * Order matters: most specific signal wins.
 *   - `x-powered-by: Next.js`  -> next
 *   - `server: cloudflare` (without next/astro signals) -> cloudflare
 *   - `<meta name="generator" content="Astro v..."`     -> astro
 *   - `x-vercel-id` header                              -> next (Vercel = Next.js)
 *   - `cf-ray` header                                   -> cloudflare
 * Falls back to `unknown` so the prompt stays generic.
 */
async function detectFramework(url: string): Promise<{
  framework: Framework;
  signals: string[];
}> {
  const signals: string[] = [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FRAMEWORK_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Dualmark-Playground/0.1 (+https://dualmark.dev/play; framework-detect)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);

    const headers = res.headers;
    const xPoweredBy = (headers.get("x-powered-by") ?? "").toLowerCase();
    const server = (headers.get("server") ?? "").toLowerCase();
    const xVercelId = headers.get("x-vercel-id");
    const cfRay = headers.get("cf-ray");
    const xAstroVersion = headers.get("x-astro-version");

    if (xPoweredBy.includes("next")) signals.push(`x-powered-by: ${xPoweredBy}`);
    if (xVercelId) signals.push(`x-vercel-id: ${xVercelId}`);
    if (xAstroVersion) signals.push(`x-astro-version: ${xAstroVersion}`);
    if (cfRay) signals.push(`cf-ray: ${cfRay}`);
    if (server) signals.push(`server: ${server}`);

    if (xPoweredBy.includes("next") || xVercelId) {
      return { framework: "next", signals };
    }
    if (xAstroVersion) {
      return { framework: "astro", signals };
    }

    const head = await readHeadBytes(res, 8 * 1024);
    const generator = head.match(
      /<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i,
    );
    if (generator) {
      const value = generator[1] ?? "";
      signals.push(`<meta generator>: ${value}`);
      const lower = value.toLowerCase();
      if (lower.includes("astro")) {
        return { framework: "astro", signals };
      }
      if (lower.includes("next")) {
        return { framework: "next", signals };
      }
    }
    if (/__CF\$cv\$params|cdn\.cloudflareinsights\.com/.test(head)) {
      signals.push("html: cloudflare insights script");
      if (cfRay || server.includes("cloudflare")) {
        return { framework: "cloudflare", signals };
      }
    }
    if (cfRay || server.includes("cloudflare")) {
      return { framework: "cloudflare", signals };
    }

    return { framework: "unknown", signals };
  } catch {
    clearTimeout(timeout);
    return { framework: "unknown", signals };
  }
}

async function readHeadBytes(res: Response, maxBytes: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < maxBytes) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.byteLength;
    }
  }
  try {
    await reader.cancel();
  } catch {
    void 0;
  }
  const merged = new Uint8Array(Math.min(total, maxBytes));
  let offset = 0;
  for (const chunk of chunks) {
    const remaining = merged.length - offset;
    if (remaining <= 0) break;
    const slice = chunk.subarray(0, remaining);
    merged.set(slice, offset);
    offset += slice.byteLength;
  }
  return new TextDecoder().decode(merged);
}

function classify(report: VerifyReport): {
  level: Level;
  ratio: number;
  percentage: number;
} {
  const ratio = report.maxScore > 0 ? report.score / report.maxScore : 0;
  const percentage = Math.round(ratio * 100);
  let level: Level;
  if (ratio >= 0.95) level = "Advanced";
  else if (ratio >= 0.8) level = "Standard";
  else if (ratio >= 0.6) level = "Basic";
  else level = "Below Basic";
  return { level, ratio, percentage };
}

function safeParseUrl(raw: string): URL | null {
  if (!raw || raw.length > MAX_URL_LENGTH) return null;
  let withProto = raw.trim();
  if (!/^https?:\/\//i.test(withProto)) {
    withProto = `https://${withProto}`;
  }
  try {
    const u = new URL(withProto);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return null;
    if (u.hostname.endsWith(".local")) return null;
    return u;
  } catch {
    return null;
  }
}

function summarize(
  report: VerifyReport,
  framework: Framework,
  frameworkSignals: string[],
) {
  const { level, ratio, percentage } = classify(report);
  return {
    url: report.url,
    mdUrl: report.mdUrl,
    score: report.score,
    maxScore: report.maxScore,
    percentage,
    ratio,
    level,
    framework,
    frameworkSignals,
    durationMs: report.durationMs,
    skippedNegotiation: report.skippedNegotiation,
    passed: report.passed.map((c) => ({
      id: c.id,
      description: c.description,
      severity: c.severity,
      weight: c.weight,
      message: c.message,
    })),
    failed: report.failed.map((c) => ({
      id: c.id,
      description: c.description,
      severity: c.severity,
      weight: c.weight,
      message: c.message,
    })),
  };
}

// Signing needs DUALMARK_SHARE_SECRET. If it's unset (e.g. local dev), skip the
// token so scoring still works; the client just won't show a share link.
async function buildShareToken(
  report: VerifyReport,
): Promise<string | undefined> {
  try {
    return await signSharePayload({
      u: report.url,
      s: report.score,
      m: report.maxScore,
      t: Math.floor(Date.now() / 1000),
    });
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawUrl =
    typeof body === "object" && body !== null && "url" in body
      ? (body as { url: unknown }).url
      : null;

  if (typeof rawUrl !== "string") {
    return NextResponse.json(
      { error: "Missing or non-string `url` in body" },
      { status: 400 },
    );
  }

  const parsed = safeParseUrl(rawUrl);
  if (!parsed) {
    return NextResponse.json(
      {
        error:
          "Invalid URL. Provide a public https URL (no localhost / .local hosts).",
      },
      { status: 400 },
    );
  }

  try {
    const [report, detection] = await Promise.all([
      verifyUrl(parsed.toString(), {
        timeoutMs: TIMEOUT_MS,
        userAgent:
          "Dualmark-Playground/0.1 (+https://dualmark.dev/play; verify-on-demand)",
      }),
      detectFramework(parsed.toString()),
    ]);
    const shareToken = await buildShareToken(report);
    return NextResponse.json(
      {
        ...summarize(report, detection.framework, detection.signals),
        shareToken,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        error: `Verification failed: ${message}`,
        url: parsed.toString(),
      },
      { status: 502 },
    );
  }
}
