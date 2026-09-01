import { index, route, type RouteConfig } from "@react-router/dev/routes";
import { dualmarkRoutes } from "@dualmark/remix/routes";
import dualmarkConfig from "./dualmark.config";

export default [
  index("routes/home.tsx"),
  route("posts", "routes/posts.tsx"),
  route("posts/:slug", "routes/post.tsx"),
  ...dualmarkRoutes(dualmarkConfig),
] satisfies RouteConfig;
