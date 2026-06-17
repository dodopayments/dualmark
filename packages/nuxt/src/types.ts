import type { Converter, CollectionEntry } from "@dualmark/converters";
import type { LlmsTxtSection, TokenEstimator } from "@dualmark/core";
export type { TokenEstimator } from "@dualmark/core";
import type {} from '@nuxt/schema';


declare module '@nuxt/schema' {
  interface NuxtConfig {
    dualmark?: DualmarkNuxtConfig;
  }
  interface NuxtOptions {
    dualmark?: DualmarkNuxtConfig;
  }
}

export interface CollectionConfig<TEntry = CollectionEntry<unknown>> {
  converter: string | Converter<TEntry>;
  compareOptions?: {
    ourBrandColumn?: string;
  };
  route?: string;
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

export interface DualmarkNuxtConfig {
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
   * Custom token estimator for the `X-Markdown-Tokens` header. Overrides the
   * default whitespace-word counter. Pass a function, or a module path
   * (e.g. `"./src/aeo-tokenizer.ts"`) for tokenizers that close over external
   * state like js-tiktoken (inline functions are serialized via `.toString()`
   * and cannot capture closures or imports).
   */
  tokenizer?: TokenEstimator | string;
}

export interface ResolvedDualmarkConfig extends DualmarkNuxtConfig {
  collections: Record<string, CollectionConfig>;
  staticPages: StaticPageConfig[];
  parameterizedRoutes: ParameterizedRouteConfig[];
  middleware: { injectLinkHeader: boolean };
  headers: { cacheControl: string; noindex: boolean };
}
