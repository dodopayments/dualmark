import { createAEOFetchEventHandler } from "@dualmark/fastly";

const handler = createAEOFetchEventHandler({
  backend: "origin_backend",
  hooks: {
    onAIRequest(info) {
      console.log(`[Dualmark] Served markdown to ${info.botName}`);
    },
    onMiss(info) {
      console.log(`[Dualmark] Fallback to HTML for ${info.pathname}`);
    }
  }
});

addEventListener("fetch", (event) => {
  event.respondWith(handler(event));
});
