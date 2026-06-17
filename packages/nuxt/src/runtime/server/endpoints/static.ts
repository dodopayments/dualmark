import { markdownResponse, type MarkdownResponseOptions } from "@dualmark/core";

import { defineEventHandler, type H3Event, type EventHandler } from "h3";

export interface StaticEndpointArgs {
  render: (event: H3Event) => string | Promise<string>;
  responseOptions?: MarkdownResponseOptions;
}

export function makeStaticEndpoint(args: StaticEndpointArgs) {
  return defineEventHandler(async (event: H3Event) => {
    const body = await args.render(event);
    return markdownResponse(body, args.responseOptions);
  });
}
