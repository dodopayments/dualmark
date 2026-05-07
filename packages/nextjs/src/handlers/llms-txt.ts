import { renderLlmsTxt, type LlmsTxtSection } from "@dualmark/core";

export interface LlmsTxtHandlerArgs {
  brandName: string;
  description?: string;
  sections: LlmsTxtSection[];
  cacheControl?: string;
}

export interface LlmsTxtHandler {
  GET: () => Response;
}

export function createLlmsTxtHandler(args: LlmsTxtHandlerArgs): LlmsTxtHandler {
  const cacheControl = args.cacheControl ?? "public, max-age=3600";
  return {
    GET() {
      const body = renderLlmsTxt({
        brandName: args.brandName,
        description: args.description,
        sections: args.sections,
      });
      return new Response(body, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Robots-Tag": "noindex",
          "Cache-Control": cacheControl,
        },
      });
    },
  };
}
