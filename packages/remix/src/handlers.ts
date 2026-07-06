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
  DualmarkRemixConfig,
  ParameterizedRouteConfig,
  ResolvedDualmarkRemixConfig,
  StaticPageConfig,
} from "./types.js";

export interface RemixResourceRouteArgs {
  request: Request;
  params?: Record<string, string | undefined>;
}

export interface RemixResourceRouteHandler {
  loader: (args: RemixResourceRouteArgs) => Promise<Response>;
  action: (args: RemixResourceRouteArgs) => Promise<Response>;
}

export interface LlmsTxtResourceRouteHandler {
  loader: (args: RemixResourceRouteArgs) => Response;
  action: (args: RemixResourceRouteArgs) => Response;
}

export type GeneratedRouteTarget =
  | { readonly kind: "collection-detail"; readonly collectionName: string }
  | { readonly kind: "parameterized"; readonly pattern: string };

interface CollectionRoute {
  readonly name: string;
  readonly config: CollectionConfig<CollectionEntry<unknown>>;
  readonly route: string;
  readonly detailPrefix: string;
  readonly listingPath: string;
  readonly converter: Converter<CollectionEntry<unknown>>;
}

interface StaticRoute {
  readonly pattern: string;
  readonly config: StaticPageConfig;
}

interface ParamRoute {
  readonly config: ParameterizedRouteConfig;
  readonly regex: RegExp;
  readonly keys: readonly string[];
}

function patternToRegex(pattern: string): { readonly regex: RegExp; readonly keys: readonly string[] } {
  const keys: string[] = [];
  const expression = pattern.replace(/\[([^\]]+)\]/g, (_, key: string) => {
    keys.push(key);
    return "([^/]+)";
  });
  return { regex: new RegExp(`^${expression}$`), keys };
}

function buildCollectionRoutes(resolved: ResolvedDualmarkRemixConfig): readonly CollectionRoute[] {
  return Object.entries(resolved.collections).map(([name, config]) => {
    const collectionConfig = config as CollectionConfig<CollectionEntry<unknown>>;
    const route = collectionConfig.route ?? name;
    const listingPath = `/${route}`;
    const converter =
      typeof collectionConfig.converter === "function"
        ? collectionConfig.converter
        : resolveBuiltInConverter({
            name: collectionConfig.converter,
            collectionName: name,
            baseConfig: { siteUrl: resolved.siteUrl },
            basePath: listingPath,
          });
    return {
      name,
      config: collectionConfig,
      route,
      detailPrefix: `${listingPath}/`,
      listingPath,
      converter,
    };
  });
}

function markdownPathToPagePath(pathname: string): string {
  const withoutTrailingSlash = pathname.replace(/\/+$/g, "") || "/";
  const stripped = withoutTrailingSlash.replace(/\.md$/, "");
  if (stripped === "/index") return "/";
  return stripped;
}

function makeListingMarkdown(
  collectionRoute: CollectionRoute,
  entries: readonly CollectionEntry<unknown>[],
  siteUrl: string,
): string {
  const config = collectionRoute.config;
  const sorted = config.sort ? [...entries].sort(config.sort) : [...entries];
  const items: ListingItem[] = sorted.map((entry) => {
    const data = entry.data as { title?: string; description?: string };
    return {
      title: data.title ?? entry.id,
      href: `${collectionRoute.listingPath}/${entry.id}`,
      description: data.description,
    };
  });
  return listingToMarkdown({
    title: config.listingMetadata?.title ?? collectionRoute.name,
    description: config.listingMetadata?.description ?? `All ${collectionRoute.name} entries.`,
    url: `${siteUrl}${collectionRoute.listingPath}`,
    items,
  });
}

function findCollectionEntry(
  entries: readonly CollectionEntry<unknown>[],
  slug: string,
  filter?: (entry: CollectionEntry<unknown>) => boolean,
): CollectionEntry<unknown> | null {
  const filtered = filter ? entries.filter(filter) : entries;
  return filtered.find((entry) => entry.id === slug) ?? null;
}

function methodNotAllowed(): Response {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { Allow: "GET, HEAD" },
  });
}

export function createDualmarkResourceRoute(
  input: DualmarkRemixConfig,
  target?: GeneratedRouteTarget,
): RemixResourceRouteHandler {
  const resolved = resolveConfig(input);
  const allCollectionRoutes = buildCollectionRoutes(resolved);
  const collectionRoutes =
    target?.kind === "collection-detail"
      ? allCollectionRoutes.filter((route) => route.name === target.collectionName)
      : allCollectionRoutes;
  const staticRoutes: readonly StaticRoute[] = resolved.staticPages.map((config) => ({
    pattern: config.pattern,
    config,
  }));
  const allParamRoutes: readonly ParamRoute[] = resolved.parameterizedRoutes.map((config) => ({
    config,
    ...patternToRegex(config.pattern),
  }));
  const paramRoutes =
    target?.kind === "parameterized"
      ? allParamRoutes.filter((route) => route.config.pattern === target.pattern)
      : allParamRoutes;
  const responseOptions: MarkdownResponseOptions = {
    cacheControl: resolved.headers.cacheControl,
    noindex: resolved.headers.noindex,
    tokenizer: resolved.tokenizer,
  };

  async function dispatch(pagePath: string): Promise<Response> {
    for (const route of staticRoutes) {
      if (pagePath === route.config.pattern) {
        return markdownResponse(await route.config.render(), responseOptions);
      }
    }
    for (const route of collectionRoutes) {
      if (route.config.emitListing !== false && pagePath === route.listingPath) {
        const entries = await route.config.getEntries();
        const filtered = route.config.filter ? entries.filter(route.config.filter) : entries;
        return markdownResponse(makeListingMarkdown(route, filtered, resolved.siteUrl), responseOptions);
      }
      if (pagePath.startsWith(route.detailPrefix)) {
        const slug = pagePath.slice(route.detailPrefix.length);
        if (slug === "") continue;
        const entries = await route.config.getEntries();
        const entry = findCollectionEntry(entries, slug, route.config.filter);
        if (!entry) return new Response("Not Found", { status: 404 });
        return markdownResponse(route.converter(entry), responseOptions);
      }
    }
    for (const route of paramRoutes) {
      const match = route.regex.exec(pagePath);
      if (!match) continue;
      const params: Record<string, string> = {};
      route.keys.forEach((key, index) => {
        const value = match[index + 1];
        if (value !== undefined) params[key] = value;
      });
      return markdownResponse(await route.config.render({ params }), responseOptions);
    }
    return new Response("Not Found", { status: 404 });
  }

  async function dispatchTargeted(
    args: RemixResourceRouteArgs,
    pagePath: string,
  ): Promise<Response> {
    if (target?.kind === "collection-detail") {
      const route = collectionRoutes[0];
      const slug = args.params?.slug ?? pagePath.slice(route?.detailPrefix.length ?? 0);
      if (!route || slug === "") return new Response("Not Found", { status: 404 });
      const entries = await route.config.getEntries();
      const entry = findCollectionEntry(entries, slug.replace(/\.md$/, ""), route.config.filter);
      if (!entry) return new Response("Not Found", { status: 404 });
      return markdownResponse(route.converter(entry), responseOptions);
    }
    if (target?.kind === "parameterized") {
      const route = paramRoutes[0];
      if (!route) return new Response("Not Found", { status: 404 });
      const params = Object.fromEntries(
        Object.entries(args.params ?? {}).filter((entry): entry is [string, string] =>
          typeof entry[1] === "string",
        ),
      );
      if (Object.keys(params).length > 0) {
        return markdownResponse(await route.config.render({ params }), responseOptions);
      }
    }
    return dispatch(pagePath);
  }

  return {
    async loader(args) {
      const pagePath = markdownPathToPagePath(new URL(args.request.url).pathname);
      return dispatchTargeted(args, pagePath);
    },
    async action() {
      return methodNotAllowed();
    },
  };
}

export function createLlmsTxtResourceRoute(
  input: DualmarkRemixConfig,
): LlmsTxtResourceRouteHandler {
  const resolved = resolveConfig(input);
  return {
    loader() {
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
    action() {
      return methodNotAllowed();
    },
  };
}
