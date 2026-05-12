import {
  listingToMarkdown,
  markdownResponse,
  renderLlmsTxt,
  type ListingItem,
  type MarkdownResponseOptions,
} from "@dualmark/core";
import type { CollectionEntry, Converter } from "@dualmark/converters";
import { resolveConfig } from "./config-validation.js";
import { resolveBuiltInConverter } from "./converter-registry.js";
import type {
  CollectionConfig,
  DualmarkSvelteKitConfig,
  ParameterizedRouteConfig,
  ResolvedDualmarkSvelteKitConfig,
  StaticPageConfig,
} from "./types.js";

export interface SvelteKitRequestEventLike {
  url: URL;
  params?: Record<string, string | undefined>;
}

export type RouteEntry = Record<string, string>;

export type GeneratedRouteTarget =
  | {
      kind: "collection-detail";
      collectionName: string;
    }
  | {
      kind: "parameterized";
      pattern: string;
    };

export interface DualmarkRouteHandler {
  GET: (event: SvelteKitRequestEventLike) => Promise<Response>;
  entries: () => Promise<RouteEntry[]>;
}

export interface LlmsTxtHandler {
  GET: () => Response;
}

interface CollectionRoute {
  name: string;
  config: CollectionConfig<CollectionEntry<unknown>>;
  route: string;
  detailPrefix: string;
  listingPath: string;
  converter: Converter<CollectionEntry<unknown>>;
}

interface StaticRoute {
  pattern: string;
  config: StaticPageConfig;
}

interface ParamRoute {
  config: ParameterizedRouteConfig;
  regex: RegExp;
  keys: string[];
}

function patternToRegex(pattern: string): { regex: RegExp; keys: string[] } {
  const keys: string[] = [];
  const re = pattern.replace(/\[([^\]]+)\]/g, (_, key: string) => {
    const cleanKey = key.startsWith("...") ? key.slice(3) : key;
    keys.push(cleanKey);
    return key.startsWith("...") ? "(.+)" : "([^/]+)";
  });
  return { regex: new RegExp(`^${re}$`), keys };
}

function buildCollectionRoutes(resolved: ResolvedDualmarkSvelteKitConfig): CollectionRoute[] {
  const routes: CollectionRoute[] = [];
  for (const [name, c] of Object.entries(resolved.collections)) {
    const config = c as CollectionConfig<CollectionEntry<unknown>>;
    const route = config.route ?? name;
    const detailPrefix = `/${route}/`;
    const listingPath = `/${route}`;
    const converter =
      typeof config.converter === "function"
        ? config.converter
        : resolveBuiltInConverter({
            name: config.converter,
            collectionName: name,
            baseConfig: { siteUrl: resolved.siteUrl },
            basePath: listingPath,
          });
    routes.push({ name, config, route, detailPrefix, listingPath, converter });
  }
  return routes;
}

function buildStaticRoutes(resolved: ResolvedDualmarkSvelteKitConfig): StaticRoute[] {
  return resolved.staticPages.map((sp) => ({ pattern: sp.pattern, config: sp }));
}

function buildParamRoutes(resolved: ResolvedDualmarkSvelteKitConfig): ParamRoute[] {
  return resolved.parameterizedRoutes.map((pr) => {
    const { regex, keys } = patternToRegex(pr.pattern);
    return { config: pr, regex, keys };
  });
}

function markdownPathToPagePath(pathname: string): string {
  const withoutSlash = pathname.replace(/\/+$/, "") || "/";
  const stripped = withoutSlash.replace(/\.md$/, "");
  if (stripped === "/index") return "/";
  return stripped;
}

function makeListingMarkdown(
  collectionRoute: CollectionRoute,
  entries: ReadonlyArray<CollectionEntry<unknown>>,
  siteUrl: string,
): string {
  const c = collectionRoute.config;
  const sorted = c.sort
    ? [...entries].sort(
        c.sort as (a: CollectionEntry<unknown>, b: CollectionEntry<unknown>) => number,
      )
    : [...entries];
  const items: ListingItem[] = sorted.map((entry) => {
    const data = entry.data as { title?: string; description?: string };
    return {
      title: data.title ?? entry.id,
      href: `${collectionRoute.listingPath}/${entry.id}`,
      description: data.description,
    };
  });
  return listingToMarkdown({
    title: c.listingMetadata?.title ?? collectionRoute.name,
    description: c.listingMetadata?.description ?? `All ${collectionRoute.name} entries.`,
    url: `${siteUrl}${collectionRoute.listingPath}`,
    items,
  });
}

function findCollectionEntry<TEntry extends CollectionEntry<unknown>>(
  entries: TEntry[],
  slug: string,
  filter?: (entry: TEntry) => boolean,
): TEntry | null {
  const filtered = filter ? entries.filter(filter) : entries;
  return filtered.find((entry) => entry.id === slug) ?? null;
}

export function createDualmarkRouteHandler(
  input: DualmarkSvelteKitConfig,
  target?: GeneratedRouteTarget,
): DualmarkRouteHandler {
  const resolved = resolveConfig(input);
  const collectionRoutes = buildCollectionRoutes(resolved);
  const staticRoutes = buildStaticRoutes(resolved);
  const paramRoutes = buildParamRoutes(resolved);
  const responseOptions: MarkdownResponseOptions = {
    cacheControl: resolved.headers.cacheControl,
    noindex: resolved.headers.noindex,
  };

  async function dispatch(pagePath: string): Promise<Response> {
    for (const sr of staticRoutes) {
      if (pagePath === sr.config.pattern) {
        const body = await sr.config.render();
        return markdownResponse(body, responseOptions);
      }
    }

    for (const cr of collectionRoutes) {
      const config = cr.config;
      const emitListing = config.emitListing !== false;
      if (emitListing && pagePath === cr.listingPath) {
        const entries = await config.getEntries();
        const filtered = config.filter ? entries.filter(config.filter) : entries;
        const body = makeListingMarkdown(cr, filtered, resolved.siteUrl);
        return markdownResponse(body, responseOptions);
      }
      if (pagePath.startsWith(cr.detailPrefix)) {
        const slug = pagePath.slice(cr.detailPrefix.length);
        if (slug === "") continue;
        const entries = await config.getEntries();
        const entry = findCollectionEntry(entries, slug, config.filter);
        if (!entry) return new Response("Not Found", { status: 404 });
        return markdownResponse(cr.converter(entry), responseOptions);
      }
    }

    for (const pr of paramRoutes) {
      const match = pr.regex.exec(pagePath);
      if (!match) continue;
      const params: Record<string, string> = {};
      pr.keys.forEach((key, index) => {
        const value = match[index + 1];
        if (value !== undefined) params[key] = value;
      });
      const body = await pr.config.render({ params });
      return markdownResponse(body, responseOptions);
    }

    return new Response("Not Found", { status: 404 });
  }

  return {
    async GET(event) {
      return dispatch(markdownPathToPagePath(event.url.pathname));
    },

    async entries() {
      if (!target) return [];

      if (target.kind === "collection-detail") {
        const collectionRoute = collectionRoutes.find((cr) => cr.name === target.collectionName);
        if (!collectionRoute) return [];
        const entries = await collectionRoute.config.getEntries();
        const filtered = collectionRoute.config.filter
          ? entries.filter(collectionRoute.config.filter)
          : entries;
        return filtered.map((entry) => ({ slug: entry.id }));
      }

      const paramRoute = paramRoutes.find((pr) => pr.config.pattern === target.pattern);
      if (!paramRoute) return [];
      const paths = await Promise.resolve(paramRoute.config.getStaticPaths());
      return paths.map((path) => path.params);
    },
  };
}

export function createLlmsTxtHandler(input: DualmarkSvelteKitConfig): LlmsTxtHandler {
  const resolved = resolveConfig(input);
  return {
    GET() {
      const body = renderLlmsTxt({
        brandName: resolved.llmsTxt?.brandName ?? "Site",
        description: resolved.llmsTxt?.description,
        sections: resolved.llmsTxt?.sections ?? [],
      });
      return new Response(body, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Robots-Tag": "noindex",
          "Cache-Control": resolved.headers.cacheControl,
        },
      });
    },
  };
}
