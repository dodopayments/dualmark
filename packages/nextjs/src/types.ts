import type { Converter, CollectionEntry } from "@dualmark/converters";
import type { LlmsTxtSection, TokenEstimator } from "@dualmark/core";

export type SlugStrategy = "catch-all" | "single";

/**
 * Configuration for a single collection. The Next.js adapter is intentionally
 * decoupled from any particular content source — you supply `getEntries`
 * (sync or async) and either a built-in converter name or a custom function.
 *
 *   collections: {
 *     blog: {
 *       converter: "blog",
 *       getEntries: () => readPostsFromFs(),
 *     },
 *   }
 */
export interface CollectionConfig<TEntry extends CollectionEntry<unknown> = CollectionEntry<unknown>> {
  /** Built-in converter name (`"blog" | "case-study" | ...`) or a custom function. */
  converter: string | Converter<TEntry>;
  /** URL segment for the collection. Defaults to the collection key. */
  route?: string;
  /** Strategy for slug placeholder. `catch-all` allows nested slugs (`/blog/2024/post`). */
  slugStrategy?: SlugStrategy;
  /** Source the entries from anywhere (filesystem, CMS, DB). */
  getEntries: () => TEntry[] | Promise<TEntry[]>;
  /** Optional filter applied after `getEntries`. */
  filter?: (entry: TEntry) => boolean;
  /** Optional sort applied to listing only. */
  sort?: (a: TEntry, b: TEntry) => number;
  listingMetadata?: {
    title: string;
    description: string;
  };
  /** Whether to emit `/<collection>.md` listing. Defaults to true. */
  emitListing?: boolean;
}

export interface StaticPageConfig {
  /** Pathname of the HTML page (e.g. `/`, `/about`). The markdown twin is served at `<pattern>.md`. */
  pattern: string;
  render: () => string | Promise<string>;
}

export interface ParameterizedRouteConfig {
  /** Astro-style pattern with `[param]` placeholders, e.g. `/tax/[country]`. */
  pattern: string;
  getStaticPaths: () =>
    | Promise<Array<{ params: Record<string, string> }>>
    | Array<{ params: Record<string, string> }>;
  render: (args: { params: Record<string, string> }) => string | Promise<string>;
}

export interface DualmarkNextConfig {
  /** Public site URL, no trailing slash (e.g. `"https://example.com"`). */
  siteUrl: string;
  /** Internal namespace under which the route handler lives. Defaults to `"md"`. */
  internalNamespace?: string;
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
    /** Inject `Link rel="alternate"; type="text/markdown"` on HTML responses. Default true. */
    injectLinkHeader?: boolean;
    /**
     * Pathnames or path-prefixes the middleware should not touch. Useful for API
     * routes, asset pipelines, and Next.js internals. By default the middleware
     * matcher already excludes `_next/`, `favicon.ico`, and the internal
     * namespace; this list is for additional user-defined skips.
     */
    skipPaths?: ReadonlyArray<string>;
  };
  headers?: {
    cacheControl?: string;
    noindex?: boolean;
  };
  /** Custom token estimator. Overrides the default whitespace-word counter. */
  tokenizer?: TokenEstimator;
}

export interface ResolvedDualmarkNextConfig extends DualmarkNextConfig {
  internalNamespace: string;
  collections: Record<string, CollectionConfig>;
  staticPages: StaticPageConfig[];
  parameterizedRoutes: ParameterizedRouteConfig[];
  middleware: {
    injectLinkHeader: boolean;
    skipPaths: ReadonlyArray<string>;
  };
  headers: { cacheControl: string; noindex: boolean };
}
