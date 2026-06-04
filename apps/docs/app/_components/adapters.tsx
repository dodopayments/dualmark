import { AstroLogo, CloudflareLogo, NextLogo } from "@/components/brand-logos";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { Section, SectionHeader } from "./section";

const CONVERTERS = [
  "blog",
  "case-study",
  "changelog",
  "compare",
  "docs",
  "feature",
  "glossary",
  "legal",
  "pricing",
  "pseo",
  "tool",
  "video",
];

interface Adapter {
  name: string;
  pkg: string;
  desc: string;
  install: string;
  score: string;
  status: string;
  accent: string;
  Logo: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
}

const adapters: Adapter[] = [
  {
    name: "Astro",
    pkg: "@dualmark/astro",
    desc: "Astro 5 integration. Auto-generates .md endpoints, ships middleware, generates llms.txt.",
    install: "bun add @dualmark/astro",
    score: "80/80",
    status: "Stable",
    accent: "oklch(0.78 0.16 30)",
    Logo: AstroLogo,
  },
  {
    name: "Next.js",
    pkg: "@dualmark/nextjs",
    desc: "Next.js 15 App Router adapter. withDualmark() + middleware factory + route handler factory + llms.txt handler.",
    install: "bun add @dualmark/nextjs",
    score: "120/125",
    status: "Stable",
    accent: "oklch(0.985 0 0)",
    Logo: NextLogo,
  },
  {
    name: "Cloudflare",
    pkg: "@dualmark/cloudflare",
    desc: "Workers edge adapter. Wraps any upstream Worker. Hooks for analytics + telemetry.",
    install: "bun add @dualmark/cloudflare",
    score: "125/125",
    status: "Stable",
    accent: "oklch(0.82 0.16 70)",
    Logo: CloudflareLogo,
  },
];

export function Adapters() {
  return (
    <Section id="adapters">
      <SectionHeader
        eyebrow="Framework adapters"
        title={
          <>
            Drop into{" "}
            <span className="text-[var(--color-accent)]">your stack.</span>
          </>
        }
        description="First-class adapters for Astro, Next.js, Cloudflare, SvelteKit, Deno, and Vercel — with Nuxt, Remix, Netlify, and Fastly on the roadmap."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {adapters.map((a) => (
          <div
            key={a.name}
            className="group relative flex flex-col gap-5 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-elev-1)]/50 p-6 transition-all hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-elev-1)]"
          >
            <div
              className="absolute right-0 top-0 size-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20"
              style={{ background: a.accent }}
            />

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] text-[var(--color-fg)]">
                  <a.Logo size={22} />
                </div>
                <div>
                  <div className="text-lg font-semibold text-[var(--color-fg)]">
                    {a.name}
                  </div>
                  <div className="font-mono text-xs text-[var(--color-fg-subtle)]">
                    {a.pkg}
                  </div>
                </div>
              </div>
              <span className="rounded-full border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-success)]">
                {a.status}
              </span>
            </div>

            <p className="text-sm text-[var(--color-fg-muted)]">{a.desc}</p>

            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 font-mono text-xs">
              <span className="text-[var(--color-fg-subtle)]">$ </span>
              <span className="text-[var(--color-fg)]">{a.install}</span>
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-[var(--color-border)] pt-4">
              <span className="text-xs text-[var(--color-fg-subtle)]">
                Reference example score
              </span>
              <span className="font-mono text-sm font-medium text-[var(--color-success)]">
                {a.score}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center gap-3 text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-fg-subtle)]">
          + 12 page-type converters
        </span>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {CONVERTERS.map((name) => (
            <span
              key={name}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] px-2.5 py-1 font-mono text-xs text-[var(--color-fg-muted)]"
            >
              {name}
            </span>
          ))}
        </div>
        <Link
          href="/docs/packages/converters"
          className="mt-1 inline-flex items-center gap-1.5 text-sm text-[var(--color-fg-muted)] underline-offset-4 hover:text-[var(--color-accent)] hover:underline"
        >
          See how converters work
          <span aria-hidden>→</span>
        </Link>
      </div>
    </Section>
  );
}
