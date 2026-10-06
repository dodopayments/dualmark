import { ServerRouter } from "react-router";
import { renderToReadableStream } from "react-dom/server";
import { createDualmarkEntryServer, type ReactRouterEntryHandler } from "@dualmark/remix";
import dualmarkConfig from "./dualmark.config";

const withDualmark = createDualmarkEntryServer(dualmarkConfig);

const handleRequest: ReactRouterEntryHandler = async (
  request,
  responseStatusCode,
  responseHeaders,
  routerContext,
) => {
  const body = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
  );
  responseHeaders.set("Content-Type", "text/html; charset=utf-8");
  return new Response(body, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
};

export default withDualmark(handleRequest);
