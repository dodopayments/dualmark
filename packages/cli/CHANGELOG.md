# @dualmark/cli

## 0.3.0

### Minor Changes

- f1a0eb0: ## v0.3.0 — Landing rewrite, Apache 2.0 relicense, /play layout consistency

  This is a meta-release. **No package source-code changes ship in this version**, but we're cutting a minor bump (rather than a patch) because the project's identity and license changed substantively in this window:
  - **Relicensed from MIT to Apache 2.0** with an Apache `NOTICE` file. Apache 2.0 includes a patent grant, which matters for infrastructure libraries that may touch standard-tracking work (content negotiation, AI bot UA detection, llms.txt). The permissive nature is unchanged. Existing 0.2.x installs are unaffected, but new installs and downstream redistributors should be aware of the license change.
  - **Landing page restructured** for problem-first positioning ("ChatGPT cites your competitor — that's an infrastructure problem"). Cut three weak sections (TrustStrip, Architecture diagram, standalone Converters page); folded Converters into Adapters as an inline chip strip; promoted the playground teaser to second-position so visitors can score their own site immediately; reframed the conformance section from "Verify CLI" to "Catch regressions in CI" with a real GitHub Actions workflow snippet; added a Dodo Payments case study with the 5× AI-agent-traffic lift; added Vercel-style vertical page rails framing the content column.
  - **Playground layout aligned with the new landing** — page rails, contained background, max-w-7xl content column.
  - **SEO/AEO metadata aligned** across `<head>`, JSON-LD organization schema, llms.txt, raw markdown twin, and Fumadocs frontmatter — every search snippet and AI crawler artifact now carries the same problem-first hook as the landing.
  - **Documentation pass**: README test-count claims corrected (now 266 across 5 packages, was incorrectly 253), `npx @dualmark/cli` unified to `bunx @dualmark/cli` across all docs, version drift in `CONTRIBUTING.md` and `packages/astro/README.md` corrected, customer proof point injected into the Next.js and Cloudflare integration pages.

  ### What changed in package source: nothing.

  All 5 packages are byte-equivalent to 0.2.1 in published shape. The minor bump is solely to communicate the license and brand-identity change clearly in the npm changelog and to give downstream auditors a clean version boundary. If you're already on 0.2.1 and don't care about the relicense announcement, you can skip this version with no functional impact.

  ### Migration
  - **Code**: none required.
  - **License notices**: if you redistribute @dualmark/\* or fork them, your `LICENSE` and `NOTICE` references should now point to Apache 2.0 (not MIT).
  - **CLI**: prefer `bunx @dualmark/cli verify <url>` over `npx @dualmark/cli verify <url>` for consistency with the rest of the project's tooling. Both still work.

### Patch Changes

- Updated dependencies [f1a0eb0]
  - @dualmark/core@0.3.0

## 0.2.1

### Patch Changes

- **Hotfix**: 0.2.0 published with unresolved `workspace:*` protocol in dependencies, breaking installation for downstream consumers. 0.2.1 publishes with proper version ranges. Switch from `changeset publish` (which delegates to `npm publish` and doesn't rewrite workspace protocol) to `bun publish` per-package, which correctly resolves `workspace:*` → actual version at pack time.

## 0.2.0

### Minor Changes

- 5e49dc2: `dualmark verify --help` and `dualmark verify -h` now print help and exit 0, matching standard CLI UX. Previously these exited 2 ("missing `<url>`") because the parser only recognized help flags as the first argument. Internal refactor: `cli.ts` is now a thin shim over `main.ts` to eliminate duplicated parsing logic.

### Patch Changes

- Updated dependencies [5e49dc2]
  - @dualmark/core@0.2.0
