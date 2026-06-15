import type { Converter, CollectionEntry } from "@dualmark/converters";
import type { LlmsTxtSection, TokenEstimator } from "@dualmark/core";
export type { TokenEstimator } from "@dualmark/core";

export type SlugStrategy = "catch-all" | "single";

export interface CollectionConfig<TEntry = CollectionEntry<unknown>> {
  converter: string | Converter<TEntry>;
  route?: string;
  slugStrategy?: SlugStrategy;
  filter?: (entry: TEntry) => boolean;
  sort?: (a: TEntry, b: TEntry) => number;
  listingMetadata?: {
    title: string;
    description: string;
  };
  emitListing?: boolean;
}

export interface StaticPageConfig {
  pattern: string;
  render: () => string | Promise<string>;
}

export interface ParameterizedRouteConfig {
  pattern: string;
  getStaticPaths: () => Promise<Array<{ params: Record<string, string> }>> | Array<{ params: Record<string, string> }>;
  render: (args: { params: Record<string, string> }) => string | Promise<string>;
}

export interface DualmarkAstroConfig {
  siteUrl: string;
  collections?: Record<string, CollectionConfig>;
  staticPages?: StaticPageConfig[];
  parameterizedRoutes?: ParameterizedRouteConfig[];
  llmsTxt?: {
    enabled?: boolean;
    brandName?: string;
    description?: string;
    sections?: LlmsTxtSection[];
  };
  middleware?: {
    injectLinkHeader?: boolean;
  };
  headers?: {
    cacheControl?: string;
    noindex?: boolean;
  };
  /**
   * Custom token estimator. Overrides the default whitespace-word counter.
   * Pass a function, or a module path (e.g. `"./src/aeo-tokenizer.ts"`)
   * for tokenizers that close over external state like js-tiktoken.
   */
  tokenizer?: TokenEstimator | string;
}

export interface ResolvedDualmarkConfig extends DualmarkAstroConfig {
  collections: Record<string, CollectionConfig>;
  staticPages: StaticPageConfig[];
  parameterizedRoutes: ParameterizedRouteConfig[];
  middleware: { injectLinkHeader: boolean };
  headers: { cacheControl: string; noindex: boolean };
}
