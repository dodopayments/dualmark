import type { Converter, CollectionEntry } from "@dualmark/converters";
import type { LlmsTxtSection, TokenEstimator } from "@dualmark/core";

export type SlugStrategy = "catch-all" | "single";

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

export interface DualmarkSvelteKitConfig {
  siteUrl: string;
  /**
   * Path to this config file from the SvelteKit project root. Generated routes
   * import it so functions like `getEntries` and `render` stay in user code.
   * Defaults to `src/dualmark.config.ts`.
   */
  configPath?: string;
  /** SvelteKit routes directory from project root. Defaults to `src/routes`. */
  routesDir?: string;
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
  /** Matches SvelteKit's `kit.appDir` (default `_app`). Used to skip negotiation on internal asset paths. */
  appDir?: string;
  headers?: {
    cacheControl?: string;
    noindex?: boolean;
  };
  /** Custom token estimator. Overrides the default whitespace-word counter. */
  tokenizer?: TokenEstimator;
}

export interface ResolvedDualmarkSvelteKitConfig extends DualmarkSvelteKitConfig {
  configPath: string;
  routesDir: string;
  collections: Record<string, CollectionConfig>;
  staticPages: StaticPageConfig[];
  parameterizedRoutes: ParameterizedRouteConfig[];
  middleware: {
    injectLinkHeader: boolean;
    skipPaths: ReadonlyArray<string>;
  };
  appDir: string;
  headers: { cacheControl: string; noindex: boolean };
}
