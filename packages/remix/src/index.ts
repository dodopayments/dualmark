export {
  createDualmarkEntryServer,
  type ReactRouterEntryHandler,
} from "./entry-server.js";

export {
  createDualmarkResourceRoute,
  createLlmsTxtResourceRoute,
  type GeneratedRouteTarget,
  type LlmsTxtResourceRouteHandler,
  type RemixResourceRouteArgs,
  type RemixResourceRouteHandler,
} from "./handlers.js";

export {
  createRouteSpecs,
  dualmarkRoutes,
  type GeneratedRouteSpec,
  type ReactRouterRouteConfigEntry,
} from "./routes.js";

export {
  dualmarkRemix,
  dualmarkRemix as dualmark,
  dualmarkRemix as default,
  generateDualmarkRoutes,
  type DualmarkRemixPlugin,
} from "./plugin.js";

export { resolveConfig, DualmarkConfigError } from "./config-validation.js";
export { resolveBuiltInConverter, type BuiltInConverterName } from "./converter-registry.js";

export type {
  CollectionConfig,
  DualmarkRemixConfig,
  ParameterizedRouteConfig,
  ResolvedDualmarkRemixConfig,
  SlugStrategy,
  StaticPageConfig,
} from "./types.js";
export type { TokenEstimator } from "@dualmark/core";
