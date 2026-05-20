/// <reference types="@fastly/js-compute" />

import { createAEOFetchEventHandler } from "@dualmark/fastly";

addEventListener(
  "fetch",
  createAEOFetchEventHandler({
    backend: "origin_0",
    trailingSlash: "never",
    hooks: {
      onAIRequest: (info) => {
        console.log(
          `[dualmark-fastly] ai-hit bot=${info.botName ?? "?"} path=${info.pathname} cache=${info.cacheStatus} tokens=${info.tokens}`,
        );
      },
      onMiss: (info) => {
        console.warn(`[dualmark-fastly] miss bot=${info.botName ?? "?"} path=${info.pathname}`);
      },
    },
  }),
);
