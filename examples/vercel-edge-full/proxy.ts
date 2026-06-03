import { NextResponse } from "next/server";
import { createAEOMiddleware } from "@dualmark/vercel";

const middleware = createAEOMiddleware({
  upstream: async () => NextResponse.next(),
  fetchAsset: async (url, init) => fetch(url.toString(), init),
  trailingSlash: "never",
  enableLinkHeader: true,
  hooks: {
    onAIRequest: (info) => {
      console.log(
        `[dualmark] ai-hit bot=${info.botName ?? "?"} path=${info.pathname} cache=${info.cacheStatus} tokens=${info.tokens}`,
      );
    },
    onMiss: (info) => {
      console.warn(`[dualmark] miss bot=${info.botName ?? "?"} path=${info.pathname}`);
    },
  },
});

export default middleware;

export const config = {
  matcher: [
    {
      source: "/((?!_next/|favicon.ico).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
