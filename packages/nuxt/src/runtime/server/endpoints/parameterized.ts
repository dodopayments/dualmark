import { markdownResponse, type MarkdownResponseOptions } from "@dualmark/core";
import { defineEventHandler, getRouterParams, type H3Event } from "h3";

export interface ParameterizedEndpointArgs {
  getStaticPaths: () =>
    | Promise<Array<{ params: Record<string, string> }>>
    | Array<{ params: Record<string, string> }>;
  render: (args: { params: Record<string, string> }, event: H3Event) => string | Promise<string>;
  responseOptions?: MarkdownResponseOptions;
}

export function makeParameterizedEndpoint(
  args: ParameterizedEndpointArgs,
) {
  let cachedPaths: Array<{ params: Record<string, string> }> | undefined;

  return defineEventHandler(async (event: H3Event) => {
    const params = getRouterParams(event);

    if (!cachedPaths) {
      cachedPaths = await args.getStaticPaths();
    }
    const isValid = cachedPaths.some((p) =>
      Object.entries(p.params).every(([key, value]) => params[key] === value)
    );

    if (!isValid) {
      return new Response("Not Found", { status: 404 });
    }

    const body = await args.render({ params }, event);
    return markdownResponse(body, args.responseOptions);
  });
}
