import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandMark } from "../../../_components/brand-mark";
import {
  levelFromScore,
  type ScoreLevel,
  type SharePayload,
  verifySharePayload,
} from "@/lib/share-token";

interface PageProps {
  params: Promise<{ token: string }>;
}

const LEVEL_TONE: Record<ScoreLevel, { color: string; border: string }> = {
  Advanced: {
    color: "var(--color-success)",
    border: "rgba(74, 222, 128, 0.4)",
  },
  Standard: {
    color: "var(--color-accent-strong)",
    border: "rgba(198, 254, 30, 0.45)",
  },
  Basic: { color: "var(--color-warning)", border: "rgba(251, 191, 36, 0.4)" },
  "Below Basic": {
    color: "var(--color-danger)",
    border: "rgba(248, 113, 113, 0.4)",
  },
};

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params;
  const payload = await verifySharePayload(token);
  if (!payload) {
    return { title: "Score not found" };
  }

  const host = hostOf(payload.u);
  const level = levelFromScore(payload.s, payload.m);
  const title = `${host} scored ${payload.s}/${payload.m} — ${level}`;
  const description = `AEO Spec v1.0 conformance for ${host}. Score your own site at dualmark.dev/play.`;
  const image = `/api/og/score?token=${encodeURIComponent(token)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/play/r/${token}`,
      type: "website",
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function SharedScorePage({ params }: PageProps) {
  const { token } = await params;
  const payload = await verifySharePayload(token);
  if (!payload) {
    notFound();
  }

  return <SharedScore payload={payload as SharePayload} />;
}

function SharedScore({ payload }: { payload: SharePayload }) {
  const host = hostOf(payload.u);
  const level = levelFromScore(payload.s, payload.m);
  const tone = LEVEL_TONE[level];
  const percentage =
    payload.m > 0 ? Math.round((payload.s / payload.m) * 100) : 0;
  const rescanHref = `/play?url=${encodeURIComponent(payload.u)}`;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-2xl flex-col items-center justify-center gap-8 px-5 py-16">
      <Link href="/play" className="flex items-center gap-2">
        <BrandMark size={22} />
        <span className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-fg-subtle)]">
          AEO Spec v1.0
        </span>
      </Link>

      <section
        className="flex w-full flex-col items-center gap-5 rounded-2xl border bg-[var(--color-bg-elev-1)] px-8 py-10 text-center shadow-2xl shadow-black/30"
        style={{ borderColor: tone.border }}
      >
        <div className="font-mono text-sm text-[var(--color-fg-muted)]">
          {host}
        </div>
        <div className="flex items-end gap-1">
          <span
            className="font-mono text-6xl font-semibold tracking-tight"
            style={{ color: tone.color }}
          >
            {payload.s}
          </span>
          <span className="mb-2 font-mono text-xl text-[var(--color-fg-subtle)]">
            / {payload.m}
          </span>
        </div>
        <span
          className="inline-flex items-center rounded-full border px-4 py-1.5 font-mono text-xs uppercase tracking-[0.18em]"
          style={{ color: tone.color, borderColor: tone.border }}
        >
          {level} · {percentage}%
        </span>
      </section>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href={rescanHref}
          className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] px-4 py-2 text-sm font-medium text-[var(--color-fg)] transition-colors hover:border-[var(--color-border-strong)]"
        >
          Re-scan this site
        </Link>
        <Link
          href="/play"
          className="inline-flex items-center gap-2 rounded-md bg-[var(--color-fg)] px-4 py-2 text-sm font-medium text-[var(--color-bg)] transition-opacity hover:opacity-90"
        >
          Score your site →
        </Link>
      </div>
    </main>
  );
}
