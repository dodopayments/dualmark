import type { Converter, CollectionEntry } from "@dualmark/converters";
import type { LlmsTxtSection, TokenEstimator } from "@dualmark/core";

export type SlugStrategy = "single" | "catch-all";

export interface CollectionConfig<
  TEntry extends CollectionEntry<unknown> = CollectionEntry<unknown>,
> {
  converter: string | Converter<TEntry>;
  route?: string;
  slugStrategy?: SlugStrategy;
  getEntries: () => TEntry[] | Promise<TEntry[]>;
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
  getStaticPaths: () =>
    | Promise<Array<{ params: Record<string, string> }>>
    | Array<{ params: Record<string, string> }>;
  render: (args: { params: Record<string, string> }) => string | Promise<string>;
}

export interface DualmarkRemixConfig {
  siteUrl: string;
  configPath?: string;
  generatedDir?: string;
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
    skipPaths?: ReadonlyArray<string>;
  };
  headers?: {
    cacheControl?: string;
    noindex?: boolean;
  };
  tokenizer?: TokenEstimator;
}

export interface ResolvedDualmarkRemixConfig extends DualmarkRemixConfig {
  configPath: string;
  generatedDir: string;
  collections: Record<string, CollectionConfig>;
  staticPages: StaticPageConfig[];
  parameterizedRoutes: ParameterizedRouteConfig[];
  middleware: {
    injectLinkHeader: boolean;
    skipPaths: ReadonlyArray<string>;
  };
  headers: { cacheControl: string; noindex: boolean };
}
