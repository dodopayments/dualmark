import { toMarkdownUrl } from "@dualmark/core";

export type CheckSeverity = "required" | "recommended";

export interface CheckResult {
  id: string;
  description: string;
  severity: CheckSeverity;
  passed: boolean;
  message: string;
  weight: number;
}

export interface VerifyReport {
  url: string;
  mdUrl: string;
  score: number;
  maxScore: number;
  checks: CheckResult[];
  passed: CheckResult[];
  failed: CheckResult[];
  skippedNegotiation: boolean;
  durationMs: number;
}

export type ConformanceLevel = "none" | "basic" | "standard" | "advanced";

export interface VerifyJsonCheck {
  id: string;
  points: number;
  max: number;
  passed: boolean;
  message: string;
}

export interface VerifyJsonReportV1 {
  url: string;
  markdownUrl: string;
  score: number;
  max: number;
  level: ConformanceLevel;
  skippedNegotiation: boolean;
  durationMs: number;
  checks: VerifyJsonCheck[];
}

export interface VerifyOptions {
  skipNegotiation?: boolean;
  fetchImpl?: typeof fetch;
  userAgent?: string;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT = 10_000;
const DEFAULT_UA = "Dualmark-Conformance/0.1 (+https://dualmark.dev)";

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  fetchImpl: typeof fetch,
): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

function check(
  id: string,
  description: string,
  severity: CheckSeverity,
  weight: number,
  passed: boolean,
  message: string,
): CheckResult {
  return { id, description, severity, weight, passed, message };
}

export async function verifyUrl(input: string, options: VerifyOptions = {}): Promise<VerifyReport> {
  const start = Date.now();
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const userAgent = options.userAgent ?? DEFAULT_UA;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
  const skipNegotiation = options.skipNegotiation ?? false;

  const isMdInput = new URL(input).pathname.endsWith(".md");
  const mdUrl = isMdInput ? input : toMarkdownUrl(input);
  const htmlUrl = isMdInput ? input.replace(/\.md(?:[?#].*)?$/, "") : input;

  const checks: CheckResult[] = [];

  let mdResponse: Response | null = null;
  let mdBody = "";
  let mdFetchError: string | null = null;
  try {
    mdResponse = await fetchWithTimeout(
      mdUrl,
      { headers: { Accept: "text/markdown", "User-Agent": userAgent } },
      timeoutMs,
      fetchImpl,
    );
    mdBody = await mdResponse.text();
  } catch (e) {
    mdFetchError = e instanceof Error ? e.message : String(e);
  }

  if (!mdResponse || !mdResponse.ok) {
    checks.push(
      check(
        "md.fetch",
        "Markdown twin URL is reachable and returns 2xx",
        "required",
        20,
        false,
        mdFetchError ?? `${mdResponse?.status ?? "no response"} from ${mdUrl}`,
      ),
    );
    return finalizeReport({
      url: htmlUrl,
      mdUrl,
      checks,
      skippedNegotiation: skipNegotiation,
      durationMs: Date.now() - start,
    });
  }

  checks.push(check("md.fetch", "Markdown twin URL is reachable and returns 2xx", "required", 20, true, "OK"));

  const ct = mdResponse.headers.get("content-type") ?? "";
  checks.push(
    check(
      "md.contentType",
      "Content-Type is text/markdown; charset=utf-8",
      "required",
      10,
      ct.toLowerCase().startsWith("text/markdown"),
      ct ? `got ${ct}` : "missing Content-Type",
    ),
  );

  const tokens = mdResponse.headers.get("x-markdown-tokens");
  checks.push(
    check(
      "md.tokensHeader",
      "X-Markdown-Tokens header is present and a positive integer",
      "required",
      10,
      tokens !== null && /^[1-9]\d*$/.test(tokens),
      tokens === null ? "missing" : `got ${tokens}`,
    ),
  );

  const robots = mdResponse.headers.get("x-robots-tag") ?? "";
  checks.push(
    check(
      "md.noindex",
      "X-Robots-Tag includes noindex",
      "required",
      10,
      robots.toLowerCase().includes("noindex"),
      robots ? `got ${robots}` : "missing",
    ),
  );

  const vary = mdResponse.headers.get("vary") ?? "";
  checks.push(
    check(
      "md.vary",
      "Vary header includes Accept",
      "required",
      10,
      vary
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .includes("accept"),
      vary ? `got ${vary}` : "missing",
    ),
  );

  checks.push(
    check(
      "md.body",
      "Body is non-empty markdown",
      "required",
      10,
      mdBody.trim().length > 0,
      `${mdBody.length} bytes`,
    ),
  );

  const aeoVersion = mdResponse.headers.get("x-aeo-version");
  checks.push(
    check(
      "md.aeoVersion",
      "X-AEO-Version header advertises spec version",
      "recommended",
      5,
      aeoVersion !== null && /^\d+\.\d+$/.test(aeoVersion),
      aeoVersion ? `got ${aeoVersion}` : "missing",
    ),
  );

  const nosniff = (mdResponse.headers.get("x-content-type-options") ?? "").toLowerCase();
  checks.push(
    check(
      "md.nosniff",
      "X-Content-Type-Options is nosniff",
      "recommended",
      5,
      nosniff === "nosniff",
      nosniff ? `got ${nosniff}` : "missing",
    ),
  );

  if (!skipNegotiation) {
    let htmlResponse: Response | null = null;
    let htmlError: string | null = null;
    try {
      htmlResponse = await fetchWithTimeout(
        htmlUrl,
        {
          headers: {
            Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
            "User-Agent": userAgent,
          },
        },
        timeoutMs,
        fetchImpl,
      );
      await htmlResponse.text();
    } catch (e) {
      htmlError = e instanceof Error ? e.message : String(e);
    }

    checks.push(
      check(
        "html.reachable",
        "HTML URL is reachable",
        "required",
        5,
        htmlResponse?.ok ?? false,
        htmlError ?? `${htmlResponse?.status ?? "no response"}`,
      ),
    );

    if (htmlResponse?.ok) {
      const linkHeader = htmlResponse.headers.get("link") ?? "";
      const hasAlternate =
        linkHeader.includes('rel="alternate"') &&
        linkHeader.toLowerCase().includes('type="text/markdown"');
      checks.push(
        check(
          "html.linkAlternate",
          "HTML response advertises markdown twin via Link rel=alternate",
          "required",
          10,
          hasAlternate,
          linkHeader || "missing",
        ),
      );
      const htmlVary = htmlResponse.headers.get("vary") ?? "";
      checks.push(
        check(
          "html.vary",
          "HTML response Vary header includes Accept",
          "recommended",
          5,
          htmlVary
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .includes("accept"),
          htmlVary || "missing",
        ),
      );
    }

    let botResponse: Response | null = null;
    try {
      botResponse = await fetchWithTimeout(
        htmlUrl,
        {
          headers: { "User-Agent": "Mozilla/5.0 GPTBot/1.0", Accept: "*/*" },
        },
        timeoutMs,
        fetchImpl,
      );
      await botResponse.text();
    } catch {
      botResponse = null;
    }
    const botCt = botResponse?.headers.get("content-type") ?? "";
    checks.push(
      check(
        "negotiation.botUa",
        "GPTBot UA receives text/markdown response",
        "recommended",
        10,
        botCt.toLowerCase().startsWith("text/markdown"),
        `Content-Type: ${botCt || "n/a"}`,
      ),
    );

    let acceptResponse: Response | null = null;
    try {
      acceptResponse = await fetchWithTimeout(
        htmlUrl,
        { headers: { Accept: "text/markdown", "User-Agent": userAgent } },
        timeoutMs,
        fetchImpl,
      );
      await acceptResponse.text();
    } catch {
      acceptResponse = null;
    }
    const acceptCt = acceptResponse?.headers.get("content-type") ?? "";
    checks.push(
      check(
        "negotiation.acceptHeader",
        "Accept: text/markdown receives text/markdown response",
        "required",
        10,
        acceptCt.toLowerCase().startsWith("text/markdown"),
        `Content-Type: ${acceptCt || "n/a"}`,
      ),
    );

    let unacceptable: Response | null = null;
    try {
      unacceptable = await fetchWithTimeout(
        htmlUrl,
        { headers: { Accept: "image/png", "User-Agent": userAgent } },
        timeoutMs,
        fetchImpl,
      );
      await unacceptable.text();
    } catch {
      unacceptable = null;
    }
    checks.push(
      check(
        "negotiation.notAcceptable",
        "Accept that excludes html+markdown returns 406",
        "recommended",
        5,
        unacceptable?.status === 406,
        `status ${unacceptable?.status ?? "n/a"}`,
      ),
    );
  }

  return finalizeReport({
    url: htmlUrl,
    mdUrl,
    checks,
    skippedNegotiation: skipNegotiation,
    durationMs: Date.now() - start,
  });
}

function finalizeReport(args: {
  url: string;
  mdUrl: string;
  checks: CheckResult[];
  skippedNegotiation: boolean;
  durationMs: number;
}): VerifyReport {
  const passed = args.checks.filter((c) => c.passed);
  const failed = args.checks.filter((c) => !c.passed);
  const score = passed.reduce((acc, c) => acc + c.weight, 0);
  const maxScore = args.checks.reduce((acc, c) => acc + c.weight, 0);
  return {
    url: args.url,
    mdUrl: args.mdUrl,
    score,
    maxScore,
    checks: args.checks,
    passed,
    failed,
    skippedNegotiation: args.skippedNegotiation,
    durationMs: args.durationMs,
  };
}

export function formatTextReport(report: VerifyReport): string {
  const lines: string[] = [];
  lines.push(`Dualmark Conformance Report`);
  lines.push(`URL:         ${report.url}`);
  lines.push(`Markdown:    ${report.mdUrl}`);
  lines.push(
    `Score:       ${report.score}/${report.maxScore}` +
      (report.skippedNegotiation ? " (negotiation checks skipped)" : ""),
  );
  lines.push(`Duration:    ${report.durationMs}ms`);
  lines.push("");
  lines.push("Passed:");
  for (const c of report.passed) {
    lines.push(`  [+${c.weight.toString().padStart(2)}] ${c.id} — ${c.description}`);
  }
  if (report.failed.length > 0) {
    lines.push("");
    lines.push("Failed:");
    for (const c of report.failed) {
      lines.push(
        `  [-${c.weight.toString().padStart(2)}] ${c.id} (${c.severity}) — ${c.description}`,
      );
      lines.push(`        reason: ${c.message}`);
    }
  }
  return lines.join("\n");
}

function levelFromScore(score: number, maxScore: number): ConformanceLevel {
  if (maxScore <= 0) return "none";
  const ratio = score / maxScore;
  if (ratio >= 0.95) return "advanced";
  if (ratio >= 0.8) return "standard";
  if (ratio >= 0.6) return "basic";
  return "none";
}

export function formatJsonReportV1(report: VerifyReport): VerifyJsonReportV1 {
  return {
    url: report.url,
    markdownUrl: report.mdUrl,
    score: report.score,
    max: report.maxScore,
    level: levelFromScore(report.score, report.maxScore),
    skippedNegotiation: report.skippedNegotiation,
    durationMs: report.durationMs,
    checks: report.checks.map((check) => ({
      id: check.id,
      points: check.passed ? check.weight : 0,
      max: check.weight,
      passed: check.passed,
      message: check.message,
    })),
  };
}
