"use client";

import Link from "next/link";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { BrandMark } from "../_components/brand-mark";
import { PageRails } from "../_components/page-rails";

type Severity = "required" | "recommended";
type Level = "Advanced" | "Standard" | "Basic" | "Below Basic";
type Framework = "astro" | "next" | "cloudflare" | "unknown";

interface CheckSummary {
  id: string;
  description: string;
  severity: Severity;
  weight: number;
  message: string;
}

interface ScoreResult {
  url: string;
  mdUrl: string;
  score: number;
  maxScore: number;
  percentage: number;
  ratio: number;
  level: Level;
  framework: Framework;
  frameworkSignals: string[];
  durationMs: number;
  skippedNegotiation: boolean;
  passed: CheckSummary[];
  failed: CheckSummary[];
  shareToken?: string;
}

const FRAMEWORK_LABEL: Record<Framework, string> = {
  astro: "Astro",
  next: "Next.js",
  cloudflare: "Cloudflare Workers",
  unknown: "your stack",
};

const FRAMEWORK_PACKAGE: Record<Framework, string> = {
  astro: "@dualmark/astro",
  next: "@dualmark/core",
  cloudflare: "@dualmark/cloudflare",
  unknown: "@dualmark/core",
};

const FRAMEWORK_DOCS: Record<Framework, string> = {
  astro: "https://dualmark.dev/docs/integrations/astro",
  next: "https://dualmark.dev/docs/integrations/nextjs",
  cloudflare: "https://dualmark.dev/docs/integrations/cloudflare-workers",
  unknown: "https://dualmark.dev/docs/quickstart",
};

const EXAMPLES = [
  { label: "dodopayments.com", url: "https://dodopayments.com" },
  { label: "developers.cloudflare.com", url: "https://developers.cloudflare.com" },
  { label: "docs.anthropic.com", url: "https://docs.anthropic.com/en/docs/get-started" },
  { label: "vercel.com", url: "https://vercel.com" },
  { label: "stripe.com", url: "https://stripe.com" },
  { label: "linear.app", url: "https://linear.app" },
];

const LEVEL_TONE: Record<Level, { color: string; bg: string; border: string }> =
  {
    Advanced: {
      color: "var(--color-success)",
      bg: "oklch(0.78 0.18 150 / 0.12)",
      border: "oklch(0.78 0.18 150 / 0.35)",
    },
    Standard: {
      color: "var(--color-accent-strong)",
      bg: "var(--color-accent-soft)",
      border: "rgba(198, 254, 30, 0.45)",
    },
    Basic: {
      color: "var(--color-warning)",
      bg: "oklch(0.82 0.16 85 / 0.12)",
      border: "oklch(0.82 0.16 85 / 0.35)",
    },
    "Below Basic": {
      color: "var(--color-danger)",
      bg: "oklch(0.68 0.22 27 / 0.12)",
      border: "oklch(0.68 0.22 27 / 0.35)",
    },
  };

const LEVEL_DESCRIPTION: Record<Level, string> = {
  Advanced:
    "Production-grade AI readiness. Your site will be cited by ChatGPT, Claude, and Perplexity reliably.",
  Standard:
    "Solid foundation. Most AI agents can read your content. A few tweaks unlock Advanced.",
  Basic:
    "AI agents can find some content, but you're leaving discoverability on the table.",
  "Below Basic":
    "AI agents likely struggle with this site. The fixes are well-scoped — let's go.",
};

function readUrlParam(search: string): string | null {
  const raw = new URLSearchParams(search).get("url")?.trim();
  if (!raw) return null;
  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    new URL(normalized);
    return normalized;
  } catch {
    return null;
  }
}

function consumeUrlParam(win: Window): void {
  const cleanUrl = `${win.location.pathname}${win.location.hash}`;
  win.history.replaceState({}, "", cleanUrl);
}

export function PlaygroundClient() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const normalized = readUrlParam(window.location.search);
    if (!normalized) return;
    setInput(normalized);
    runScore(normalized);
    consumeUrlParam(window);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runScore(url: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/play/score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as ScoreResult | { error: string };
      if (!res.ok || "error" in data) {
        setError("error" in data ? data.error : `HTTP ${res.status}`);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    runScore(input.trim());
  }

  return (
    <main className="relative isolate min-h-[calc(100vh-3.5rem)]">
      <PageRails />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 mx-auto w-full max-w-7xl overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(198,254,30,0.16),transparent_70%)]" />
        <div className="absolute inset-0 bg-grid mask-radial-fade opacity-25" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-6 py-10 md:px-8 md:py-16">
        <div className="mb-10 flex flex-col items-start gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-accent)]">
            <span className="size-1.5 rounded-full bg-[var(--color-accent)]" />
            Free · No signup
          </span>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-[var(--color-fg)] md:text-5xl">
            Is your site ready for{" "}
            <span className="bg-gradient-to-r from-[#e8ffa8] via-[#c6fe1e] to-[#9ee847] bg-clip-text text-transparent">
              AI agents?
            </span>
          </h1>
          <p className="max-w-2xl text-pretty text-base text-[var(--color-fg-muted)] md:text-lg">
            Paste any public URL. We&apos;ll score it 0–125 against the{" "}
            <Link
              href="/docs/spec/overview"
              className="text-[var(--color-fg)] underline-offset-2 hover:underline"
            >
              AEO Spec v1.0
            </Link>{" "}
            — the same checks ChatGPT, Claude, and Perplexity expect.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mb-3">
          <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-2 shadow-2xl shadow-black/30 sm:flex-row sm:gap-1.5">
            <div className="flex flex-1 items-center gap-2 px-3">
              <UrlIcon className="size-4 text-[var(--color-fg-subtle)]" />
              <input
                type="text"
                inputMode="url"
                placeholder="https://yourcompany.com"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                className="h-10 w-full bg-transparent font-mono text-sm text-[var(--color-fg)] outline-none placeholder:text-[var(--color-fg-subtle)] disabled:opacity-60"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 text-sm font-semibold text-[var(--color-accent-ink)] transition-all hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <SpinIcon className="size-4 animate-spin" />
                  Scoring…
                </>
              ) : (
                <>
                  Score it
                  <span aria-hidden>→</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mb-10 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-fg-subtle)]">
            Try:
          </span>
          {EXAMPLES.map((ex) => (
            <button
              type="button"
              key={ex.url}
              onClick={() => {
                setInput(ex.url);
                runScore(ex.url);
              }}
              disabled={loading}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] px-2.5 py-1 font-mono text-xs text-[var(--color-fg-muted)] transition-all hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)] disabled:opacity-50"
            >
              {ex.label}
            </button>
          ))}
        </div>

        {error && <ErrorPanel message={error} />}
        {loading && <LoadingPanel url={input.trim()} />}
        {result && !loading && <ResultPanel result={result} />}
        {!result && !loading && !error && <EmptyState />}

        <p className="mt-12 text-center text-xs text-[var(--color-fg-subtle)]">
          Same scoring engine as{" "}
          <Link
            href="/docs/packages/cli"
            className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:underline"
          >
            <code className="font-mono">@dualmark/cli</code>
          </Link>
          . We fetch from our server (not yours) — your URL is not stored or
          logged.
        </p>
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-elev-1)]/30 px-6 py-16 text-center">
      <BrandMark size={36} className="opacity-60" />
      <h3 className="text-base font-medium text-[var(--color-fg)]">
        Paste a URL to get started
      </h3>
      <p className="max-w-sm text-sm text-[var(--color-fg-muted)]">
        We&apos;ll run 14 checks against the AEO Spec and show you exactly
        what&apos;s working — and what to fix.
      </p>
    </div>
  );
}

function LoadingPanel({ url }: { url: string }) {
  const steps = [
    "Fetching markdown twin",
    "Verifying response headers",
    "Checking content negotiation",
    "Scoring against spec",
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)]">
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-elev-2)] px-5 py-3">
        <BrandMark size={18} />
        <span className="truncate font-mono text-xs text-[var(--color-fg-muted)]">
          {url || "Fetching…"}
        </span>
        <span className="ml-auto inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[var(--color-accent)]">
          <SpinIcon className="size-3 animate-spin" />
          Running
        </span>
      </div>
      <ul className="divide-y divide-[var(--color-border)]">
        {steps.map((s, i) => (
          <li
            key={s}
            className="flex items-center gap-3 px-5 py-3 text-sm text-[var(--color-fg-muted)]"
            style={{
              animation: `var(--animate-fade-in)`,
              animationDelay: `${i * 0.4}s`,
              animationFillMode: "both",
            }}
          >
            <SpinIcon className="size-3.5 animate-spin text-[var(--color-accent)]" />
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-5 py-4">
      <AlertIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-danger)]" />
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-[var(--color-fg)]">
          Couldn&apos;t score that URL
        </span>
        <span className="text-sm text-[var(--color-fg-muted)]">{message}</span>
      </div>
    </div>
  );
}

function ResultPanel({ result }: { result: ScoreResult }) {
  const tone = LEVEL_TONE[result.level];
  const required = result.failed.filter((c) => c.severity === "required");
  const recommended = result.failed.filter((c) => c.severity === "recommended");

  return (
    <div className="flex flex-col gap-4">
      <section
        className="overflow-hidden rounded-2xl border bg-[var(--color-bg-elev-1)] shadow-2xl shadow-black/30"
        style={{ borderColor: tone.border }}
      >
        <div className="grid gap-6 px-6 py-7 md:grid-cols-[auto_1fr] md:gap-8 md:px-8">
          <ScoreGauge result={result} tone={tone} />
          <div className="flex flex-col justify-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em]"
                style={{
                  background: tone.bg,
                  color: tone.color,
                  borderColor: tone.border,
                }}
              >
                {result.level}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
                {result.percentage}% conformance
              </span>
            </div>
            <a
              href={result.url}
              target="_blank"
              rel="noreferrer"
              className="break-all text-base font-medium text-[var(--color-fg)] hover:text-[var(--color-accent-strong)] hover:underline"
            >
              {result.url}
            </a>
            <p className="text-sm text-[var(--color-fg-muted)]">
              {LEVEL_DESCRIPTION[result.level]}
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1 font-mono text-[11px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
              <span>
                <span className="text-[var(--color-success)]">
                  {result.passed.length}
                </span>{" "}
                passed
              </span>
              <span>
                <span className="text-[var(--color-danger)]">
                  {required.length}
                </span>{" "}
                required failed
              </span>
              <span>
                <span className="text-[var(--color-warning)]">
                  {recommended.length}
                </span>{" "}
                recommended failed
              </span>
              <span>{result.durationMs}ms</span>
            </div>
          </div>
        </div>
      </section>

      <ShareBar result={result} />

      <CheckList
        title="Failed — required"
        accent="var(--color-danger)"
        checks={required}
        emptyMessage="All required checks passed."
      />
      <CheckList
        title="Failed — recommended"
        accent="var(--color-warning)"
        checks={recommended}
        emptyMessage="All recommended checks passed."
      />
      <CheckList
        title={`Passed (${result.passed.length})`}
        accent="var(--color-success)"
        checks={result.passed}
        collapsible
        emptyMessage="No checks passed."
      />

      {result.failed.length > 0 && <FixWithAI result={result} />}

      <NextStepsCard result={result} />
    </div>
  );
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function ShareBar({ result }: { result: ScoreResult }) {
  const [copied, setCopied] = useState(false);
  const token = result.shareToken;

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  if (!token) return null;

  const host = hostFromUrl(result.url);
  const shareUrl = () => `${window.location.origin}/play/r/${token}`;
  const imageUrl = `/api/og/score?token=${encodeURIComponent(token)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopied(true);
    } catch {
      void 0;
    }
  }

  function postToX() {
    const text = `${host} scored ${result.score}/${result.maxScore} (${result.level}) on the AEO Spec v1.0`;
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text,
    )}&url=${encodeURIComponent(shareUrl())}`;
    window.open(intent, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)]/40 px-5 py-4">
      <div className="flex items-center gap-2">
        <ShareIcon className="size-4 text-[var(--color-accent)]" />
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-fg-subtle)]">
          Share this score
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] px-3 text-xs font-medium text-[var(--color-fg)] transition-colors hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-bg-elev-2)]"
        >
          {copied ? (
            <CheckIcon className="size-4 text-[var(--color-success)]" />
          ) : (
            <UrlIcon className="size-4" />
          )}
          {copied ? "Copied!" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={postToX}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] px-3 text-xs font-medium text-[var(--color-fg)] transition-colors hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-bg-elev-2)]"
        >
          <XGlyph className="size-3.5" />
          Post on X
        </button>
        <a
          href={imageUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] px-3 text-xs font-medium text-[var(--color-fg)] transition-colors hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-bg-elev-2)]"
        >
          <ImageIcon className="size-4" />
          Image
        </a>
      </div>
    </section>
  );
}

function ScoreGauge({
  result,
  tone,
}: {
  result: ScoreResult;
  tone: { color: string; bg: string; border: string };
}) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - result.ratio);

  return (
    <div className="flex shrink-0 items-center justify-center">
      <div className="relative size-[140px]">
        <svg
          viewBox="0 0 140 140"
          className="size-full -rotate-90"
          aria-hidden
        >
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="10"
          />
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke={tone.color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 800ms cubic-bezier(0.16,1,0.3,1)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className="font-mono text-3xl font-semibold tracking-tight"
            style={{ color: tone.color }}
          >
            {result.score}
          </div>
          <div className="font-mono text-xs text-[var(--color-fg-subtle)]">
            / {result.maxScore}
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckList({
  title,
  accent,
  checks,
  collapsible,
  emptyMessage,
}: {
  title: string;
  accent: string;
  checks: CheckSummary[];
  collapsible?: boolean;
  emptyMessage: string;
}) {
  const [open, setOpen] = useState(!collapsible);

  if (checks.length === 0) {
    return (
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)]/40 px-5 py-4">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-fg-subtle)]">
            {title}
          </h3>
          <span className="text-xs text-[var(--color-fg-subtle)]">
            {emptyMessage}
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)]/40">
      <button
        type="button"
        onClick={() => collapsible && setOpen((v) => !v)}
        className={`flex w-full items-center justify-between px-5 py-3 text-left ${collapsible ? "cursor-pointer hover:bg-[var(--color-bg-elev-2)]/40" : "cursor-default"}`}
      >
        <h3
          className="font-mono text-[11px] uppercase tracking-[0.16em]"
          style={{ color: accent }}
        >
          {title} · {checks.length}
        </h3>
        {collapsible && (
          <ChevronIcon
            className={`size-4 text-[var(--color-fg-subtle)] transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>
      {open && (
        <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
          {checks.map((c) => (
            <li key={c.id} className="flex items-start gap-3 px-5 py-3">
              <span
                className="mt-1 inline-flex w-12 shrink-0 justify-center rounded px-1 py-0.5 font-mono text-[11px]"
                style={{ background: `${accent}1a`, color: accent }}
              >
                {accent === "var(--color-success)" ? "+" : ""}
                {c.weight}
              </span>
              <div className="flex flex-col gap-0.5">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-sm text-[var(--color-fg)]">
                    {c.id}
                  </span>
                  <span className="text-[11px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
                    {c.severity}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-fg-muted)]">
                  {c.description}
                </p>
                <p className="font-mono text-xs text-[var(--color-fg-subtle)]">
                  {c.message}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function buildFixPrompt(result: ScoreResult): string {
  const required = result.failed.filter((c) => c.severity === "required");
  const recommended = result.failed.filter(
    (c) => c.severity === "recommended",
  );
  const fwLabel = FRAMEWORK_LABEL[result.framework];
  const pkg = FRAMEWORK_PACKAGE[result.framework];
  const docs = FRAMEWORK_DOCS[result.framework];

  const failureLines = [...required, ...recommended].map(
    (c) =>
      `- [${c.severity === "required" ? "REQUIRED" : "recommended"}] ${c.id} (-${c.weight}): ${c.description}\n  Reason: ${c.message}`,
  );

  return `I need help making my site AI-search ready (AEO — Answer Engine Optimization).

I just scored my site against the AEO Spec v1.0 and got ${result.score}/${result.maxScore} (${result.percentage}%, level: ${result.level}).

## Site
- URL: ${result.url}
- Markdown twin URL (expected): ${result.mdUrl}
- Detected stack: ${fwLabel}

## What failed (${result.failed.length} checks)
${failureLines.join("\n")}

## What I want you to help me do
Implement Dualmark on my site so AI agents (ChatGPT, Claude, Perplexity, Gemini, Google AI Overviews) can read and cite my content.

The recommended package for ${fwLabel} is **${pkg}**.

Documentation: ${docs}

For ${fwLabel === "Astro" ? "Astro, install `@dualmark/astro` and add it to `astro.config.mjs` as an integration." : fwLabel === "Next.js" ? "Next.js (App Router), install `@dualmark/core` and `@dualmark/converters`, then wire content negotiation into `middleware.ts` and add a catch-all `/[[...slug]].md` route handler." : fwLabel === "Cloudflare Workers" ? "Cloudflare Workers, install `@dualmark/cloudflare` and wrap your existing Worker with `createAEOWorker()`." : "any framework, start with `@dualmark/core` (framework-agnostic primitives) and check the quickstart docs for your specific stack."}

Please:
1. Walk me through the exact code changes needed to fix the failing checks above.
2. Show me the diff against my current setup if possible.
3. Explain how each change addresses a specific failed check (reference the check IDs above).
4. Verify your suggestions match the AEO Spec at https://dualmark.dev/docs/spec/overview

After I implement, I'll re-run https://dualmark.dev/play to confirm the fixes worked.`;
}

function FixWithAI({ result }: { result: ScoreResult }) {
  const prompt = useMemo(() => buildFixPrompt(result), [result]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = prompt;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
      } catch {
        void 0;
      }
      document.body.removeChild(ta);
    }
  }

  function openWith(target: "chatgpt" | "claude" | "cursor") {
    const encoded = encodeURIComponent(prompt);
    const urls: Record<typeof target, string> = {
      chatgpt: `https://chatgpt.com/?q=${encoded}`,
      claude: `https://claude.ai/new?q=${encoded}`,
      cursor: `cursor://anysphere.cursor-deeplink/prompt?text=${encoded}`,
    };
    window.open(urls[target], "_blank", "noopener,noreferrer");
  }

  const detectedLabel = FRAMEWORK_LABEL[result.framework];
  const isUnknown = result.framework === "unknown";

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--color-accent)]/30 bg-gradient-to-br from-[var(--color-bg-elev-1)] to-[var(--color-accent-soft)]/40">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)]/60 bg-[var(--color-bg-elev-2)]/40 px-5 py-3">
        <div className="flex items-center gap-2">
          <SparkleIcon className="size-4 text-[var(--color-accent)]" />
          <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-accent)]">
            Fix with AI
          </h3>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
          {isUnknown ? "Stack: unknown" : `Detected: ${detectedLabel}`}
        </span>
      </header>

      <div className="flex flex-col gap-4 px-5 py-5">
        <p className="text-sm text-[var(--color-fg)]">
          Hand the fix to your AI coding assistant. We&apos;ll generate a
          prompt with your failed checks, the {isUnknown ? "recommended" : detectedLabel}{" "}
          integration steps, and links to the spec.
        </p>

        <details className="group rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]">
            <span className="font-mono uppercase tracking-wider">
              Preview prompt ({prompt.length.toLocaleString()} chars)
            </span>
            <ChevronIcon className="size-3.5 transition-transform group-open:rotate-180" />
          </summary>
          <pre className="max-h-72 overflow-auto border-t border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 font-mono text-[11px] leading-relaxed text-[var(--color-fg-muted)] whitespace-pre-wrap">
            {prompt}
          </pre>
        </details>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <LaunchButton
            onClick={() => openWith("chatgpt")}
            label="ChatGPT"
            icon={<ChatGptGlyph className="size-4" />}
          />
          <LaunchButton
            onClick={() => openWith("claude")}
            label="Claude"
            icon={<ClaudeGlyph className="size-4" />}
          />
          <LaunchButton
            onClick={() => openWith("cursor")}
            label="Cursor"
            icon={<CursorGlyph className="size-4" />}
          />
          <LaunchButton
            onClick={copyPrompt}
            label={copied ? "Copied!" : "Copy"}
            icon={
              copied ? (
                <CheckIcon className="size-4 text-[var(--color-success)]" />
              ) : (
                <CopyIcon className="size-4" />
              )
            }
            highlight={copied}
          />
        </div>

        <p className="text-[11px] text-[var(--color-fg-subtle)]">
          The prompt recommends{" "}
          <code className="font-mono text-[var(--color-fg-muted)]">
            {FRAMEWORK_PACKAGE[result.framework]}
          </code>
          {" — "}
          ChatGPT/Claude open with the prompt prefilled · Cursor uses its
          deeplink protocol (will prompt to open the app) · Copy puts the
          prompt on your clipboard for any other tool.
        </p>
      </div>
    </section>
  );
}

function LaunchButton({
  onClick,
  label,
  icon,
  highlight,
}: {
  onClick: () => void;
  label: string;
  icon: ReactNode;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-xs font-medium transition-all ${
        highlight
          ? "border-[var(--color-success)]/50 bg-[var(--color-success)]/10 text-[var(--color-fg)]"
          : "border-[var(--color-border)] bg-[var(--color-bg-elev-1)] text-[var(--color-fg)] hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-bg-elev-2)]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function NextStepsCard({ result }: { result: ScoreResult }) {
  const requiredCount = result.failed.filter(
    (c) => c.severity === "required",
  ).length;
  const isPerfect = result.failed.length === 0;
  const isAdvanced = result.level === "Advanced";
  const noMarkdownTwin =
    result.failed.length === 1 &&
    result.failed[0]?.id === "md.fetch" &&
    result.passed.length === 0;

  let body: ReactNode;
  if (isPerfect) {
    body = (
      <p className="text-sm text-[var(--color-fg)]">
        Perfect score. Your site is fully AEO Spec v1.0 compliant. Now share
        this result.
      </p>
    );
  } else if (noMarkdownTwin) {
    body = (
      <p className="text-sm text-[var(--color-fg-muted)]">
        This site doesn&apos;t serve a markdown twin yet. Drop in Dualmark in
        ~30 seconds and AI agents will be able to read every page.
      </p>
    );
  } else if (isAdvanced) {
    body = (
      <p className="text-sm text-[var(--color-fg-muted)]">
        You&apos;re at Advanced level — but a few recommended checks would
        tighten the score.
      </p>
    );
  } else {
    body = (
      <p className="text-sm text-[var(--color-fg-muted)]">
        Fix the {requiredCount} required check{requiredCount === 1 ? "" : "s"}{" "}
        above to ship a markdown twin AI agents can actually consume.
      </p>
    );
  }

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-bg-elev-1)] to-[var(--color-bg-elev-2)] px-6 py-5">
      <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-accent)]">
        Next steps
      </h3>
      {isPerfect ? (
        body
      ) : (
        <div className="flex flex-col gap-3 text-sm text-[var(--color-fg-muted)]">
          {body}
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href="/docs/quickstart"
              className="inline-flex items-center gap-2 rounded-md bg-[var(--color-fg)] px-3.5 py-2 text-xs font-medium text-[var(--color-bg)] transition-opacity hover:opacity-90"
            >
              30-second quickstart →
            </Link>
            <Link
              href="/docs/conformance/scoring"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] px-3.5 py-2 text-xs font-medium text-[var(--color-fg)] transition-colors hover:border-[var(--color-border-strong)]"
            >
              How scoring works
            </Link>
            <Link
              href="/docs/spec/overview"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] px-3.5 py-2 text-xs font-medium text-[var(--color-fg)] transition-colors hover:border-[var(--color-border-strong)]"
            >
              Read the AEO Spec
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

function UrlIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1m-2 8a4 4 0 0 1-5.66 0 4 4 0 0 1 0-5.66l3-3a4 4 0 0 1 5.66 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
function SpinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
function AlertIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 8v4m0 3.5h.01"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3l1.8 4.8L18.6 9.6 13.8 11.4 12 16.2 10.2 11.4 5.4 9.6l4.8-1.8L12 3z"
        fill="currentColor"
        opacity="0.85"
      />
      <path
        d="M19 15l.9 2.4L22.3 18.3 19.9 19.2 19 21.6 18.1 19.2 15.7 18.3 18.1 17.4 19 15z"
        fill="currentColor"
        opacity="0.55"
      />
    </svg>
  );
}
function CopyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect
        x="9"
        y="9"
        width="11"
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M5 15V6a2 2 0 0 1 2-2h9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="m5 12 5 5L20 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ChatGptGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.057 6.057 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.057 6.057 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.142-.08 4.774-2.757a.795.795 0 0 0 .392-.681v-6.737l2.018 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.488 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.778 2.758a.777.777 0 0 0 .787 0l5.831-3.367v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.018 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.773 2.758a.795.795 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"
        fill="currentColor"
      />
    </svg>
  );
}
function ClaudeGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M4.709 15.955l4.72-2.647.079-.23-.079-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.448.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.146-.103.018-.072-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 0 1-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.142-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.413.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z"
        fill="currentColor"
      />
    </svg>
  );
}
function CursorGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M11.925 24l10.425-6.01V5.99L11.925 0 1.5 5.99v12L11.925 24z"
        fill="currentColor"
        opacity="0.95"
      />
      <path
        d="M22.35 5.99L11.925 12 1.5 5.99 11.925 24V12z"
        fill="currentColor"
        opacity="0.55"
      />
    </svg>
  );
}
function ShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M8.7 13.3 15.3 17M15.3 7 8.7 10.7M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
function XGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z"
        fill="currentColor"
      />
    </svg>
  );
}
function ImageIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" />
      <path
        d="m4 18 5-5 4 4 3-3 4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
