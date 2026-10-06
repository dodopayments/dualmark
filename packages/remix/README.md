# @dualmark/remix

React Router v7 Framework Mode adapter for the Dualmark AEO framework.

This package targets the unified React Router v7 surface that replaced Remix's framework APIs. It generates markdown resource routes and provides an `entry.server.tsx` helper for bot-aware content negotiation before HTML rendering.

## Install

```bash
bun add @dualmark/remix @dualmark/core @dualmark/converters
```

## Usage

```ts title="vite.config.ts"
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import dualmark from "@dualmark/remix";
import dualmarkConfig from "./app/dualmark.config";

export default defineConfig({
  plugins: [dualmark(dualmarkConfig), reactRouter()],
});
```

```ts title="app/routes.ts"
import { index, route, type RouteConfig } from "@react-router/dev/routes";
import { dualmarkRoutes } from "@dualmark/remix/routes";
import dualmarkConfig from "./dualmark.config";

export default [
  index("routes/home.tsx"),
  route("posts", "routes/posts.tsx"),
  route("posts/:slug", "routes/post.tsx"),
  ...dualmarkRoutes(dualmarkConfig),
] satisfies RouteConfig;
```

Wrap `app/entry.server.tsx` with `createDualmarkEntryServer(config)` so bot UAs and `Accept: text/markdown` requests receive markdown before React Router renders HTML.

## React Router docs

Use the current React Router pages:

- Framework installation: https://reactrouter.com/start/framework/installation
- Resource routes: https://reactrouter.com/how-to/resource-routes
- Special files: https://reactrouter.com/explanation/special-files

## Notes

`slugStrategy: "single"` is supported. `slugStrategy: "catch-all"` is rejected because React Router v7 splats only match safely at the end of a route (`docs/*`). That route would also catch human HTML paths, so the adapter does not generate it.

## License

Apache 2.0
