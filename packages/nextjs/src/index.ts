export {
  createDualmarkMiddleware,
  buildMatcherSource,
  toInternalMarkdownPath,
  DUALMARK_DEFAULT_MATCHER_SOURCE,
  type DualmarkMiddleware,
} from "./middleware.js";

export {
  createDualmarkRouteHandler,
  type DualmarkRouteHandler,
} from "./handlers/markdown-route.js";

export {
  createLlmsTxtHandler,
  type LlmsTxtHandler,
  type LlmsTxtHandlerArgs,
} from "./handlers/llms-txt.js";

export { withDualmark } from "./with-dualmark.js";

export { resolveConfig, DualmarkConfigError } from "./config-validation.js";

export {
  resolveBuiltInConverter,
  type BuiltInConverterName,
} from "./converter-registry.js";

export type {
  DualmarkNextConfig,
  ResolvedDualmarkNextConfig,
  CollectionConfig,
  StaticPageConfig,
  ParameterizedRouteConfig,
  SlugStrategy,
} from "./types.js";
export type { TokenEstimator } from "@dualmark/core";
