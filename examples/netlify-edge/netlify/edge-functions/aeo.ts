/**
 * Netlify Edge Function: AEO adapter entrypoint.
 *
 * Architecture:
 *   - Astro builds to ./dist/ as static HTML + .md twins
 *   - Netlify serves the dist/ directory as static files
 *   - This edge function intercepts all requests before they reach the static files
 *   - .md twin requests are served directly by the worker (works at any path depth,
 *     in both local dev and production)
 *   - AI bots and Accept: text/markdown clients receive markdown
 *   - All other traffic falls through via context.next() to the static site
 */
import { createAEOWorker } from "@dualmark/netlify";
import type { AIRequestInfo, MissInfo } from "@dualmark/netlify";

export default createAEOWorker({
  trailingSlash: "never",
  enableLinkHeader: true,
  hooks: {
    onAIRequest: (info: AIRequestInfo) => {
      console.log(
        `[dualmark] ai-hit bot=${info.botName ?? "?"} path=${info.pathname} cache=${info.cacheStatus} tokens=${info.tokens}`,
      );
    },
    onMiss: (info: MissInfo) => {
      console.warn(`[dualmark] miss bot=${info.botName ?? "?"} path=${info.pathname}`);
    },
  },
});

export const config = { path: "/*" };
