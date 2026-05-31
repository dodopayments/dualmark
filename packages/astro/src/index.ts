export {
  createDualmarkIntegration,
  default as dualmark,
  type AstroIntegrationLike,
} from "./integration.js";
export { default } from "./integration.js";
export { resolveConfig, DualmarkConfigError } from "./config-validation.js";
export type {
  DualmarkAstroConfig,
  ResolvedDualmarkConfig,
  CollectionConfig,
  StaticPageConfig,
  ParameterizedRouteConfig,
  SlugStrategy,
  TokenEstimator,
} from "./types.js";
export { resolveBuiltInConverter, type BuiltInConverterName } from "./converter-registry.js";
