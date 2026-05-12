export {
  createDualmarkHandle,
  handleRequest,
  type DualmarkHandle,
  type FetchLike,
} from "./handle.js";

export {
  createDualmarkRouteHandler,
  createLlmsTxtHandler,
  type DualmarkRouteHandler,
  type LlmsTxtHandler,
} from "./handlers.js";

export {
  dualmarkSvelteKit,
  dualmarkSvelteKit as dualmark,
  dualmarkSvelteKit as default,
  type DualmarkSvelteKitPlugin,
} from "./plugin.js";

export { resolveConfig, DualmarkConfigError } from "./config-validation.js";

export { resolveBuiltInConverter, type BuiltInConverterName } from "./converter-registry.js";

export type {
  CollectionConfig,
  DualmarkSvelteKitConfig,
  ParameterizedRouteConfig,
  ResolvedDualmarkSvelteKitConfig,
  SlugStrategy,
  StaticPageConfig,
} from "./types.js";
