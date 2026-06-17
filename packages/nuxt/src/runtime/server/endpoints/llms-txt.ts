import { renderLlmsTxt, type LlmsTxtSection } from "@dualmark/core";

import { defineEventHandler, type H3Event, type EventHandler } from "h3";

export interface LlmsTxtEndpointArgs {
  brandName: string;
  description?: string;
  sections: LlmsTxtSection[];
}

export function makeLlmsTxtEndpoint(args: LlmsTxtEndpointArgs) {
  return defineEventHandler((_event: H3Event) => {
    const body = renderLlmsTxt(args);
    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex",
        "Cache-Control": "public, max-age=3600",
      },
    });
  });
}
