import {
  listingToMarkdown,
  markdownResponse,
  type ListingItem,
  type MarkdownResponseOptions,
} from "@dualmark/core";
import type { CollectionEntry, Converter } from "@dualmark/converters";
import { resolveConfig } from "../config-validation.js";
import { resolveBuiltInConverter } from "../converter-registry.js";
import type {
  CollectionConfig,
  DualmarkNextConfig,
  ParameterizedRouteConfig,
  ResolvedDualmarkNextConfig,
  StaticPageConfig,
} from "../types.js";

export interface DualmarkRouteHandler {
  GET: (
    req: Request,
    ctx: { params: Promise<{ path: string[] }> },
  ) => Promise<Response>;
  generateStaticParams: () => Promise<Array<{ path: string[] }>>;
}

function joinPath(parts: ReadonlyArray<string>): string {
  if (!parts || parts.length === 0) return "/";
  return "/" + parts.filter((p) => p !== "").join("/");
}

function pathToParts(pathname: string): string[] {
  const trimmed = pathname.replace(/^\/+|\/+$/g, "");
  if (trimmed === "") return ["index"];
  return trimmed.split("/");
}

function patternToRegex(pattern: string): { regex: RegExp; keys: string[] } {
  const keys: string[] = [];
  const re = pattern.replace(/\[([^\]]+)\]/g, (_, k) => {
    keys.push(k);
    return "([^/]+)";
  });
  return { regex: new RegExp(`^${re}$`), keys };
}

interface CollectionRoute {
  name: string;
  config: CollectionConfig<CollectionEntry<unknown>>;
  route: string;
  detailPrefix: string;
  listingPath: string;
  converter: Converter<CollectionEntry<unknown>>;
}

function buildCollectionRoutes(
  resolved: ResolvedDualmarkNextConfig,
): CollectionRoute[] {
  const routes: CollectionRoute[] = [];
  for (const [name, c] of Object.entries(resolved.collections)) {
    const cfg = c as CollectionConfig<CollectionEntry<unknown>>;
    const route = cfg.route ?? name;
    const detailPrefix = `/${route}/`;
    const listingPath = `/${route}`;
    const converter =
      typeof cfg.converter === "function"
        ? cfg.converter
        : resolveBuiltInConverter({
            name: cfg.converter,
            collectionName: name,
            baseConfig: { siteUrl: resolved.siteUrl },
          });
    routes.push({ name, config: cfg, route, detailPrefix, listingPath, converter });
  }
  return routes;
}

interface StaticRoute {
  pattern: string;
  config: StaticPageConfig;
}

function buildStaticRoutes(resolved: ResolvedDualmarkNextConfig): StaticRoute[] {
  return resolved.staticPages.map((sp) => ({ pattern: sp.pattern, config: sp }));
}

interface ParamRoute {
  config: ParameterizedRouteConfig;
  regex: RegExp;
  keys: string[];
}

function buildParamRoutes(resolved: ResolvedDualmarkNextConfig): ParamRoute[] {
  return resolved.parameterizedRoutes.map((pr) => {
    const { regex, keys } = patternToRegex(pr.pattern);
    return { config: pr, regex, keys };
  });
}

function makeListingMarkdown(
  collectionRoute: CollectionRoute,
  entries: ReadonlyArray<CollectionEntry<unknown>>,
  siteUrl: string,
): string {
  const c = collectionRoute.config;
  const sorted = c.sort
    ? [...entries].sort(c.sort as (a: CollectionEntry<unknown>, b: CollectionEntry<unknown>) => number)
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
    description:
      c.listingMetadata?.description ?? `All ${collectionRoute.name} entries.`,
    url: `${siteUrl}${collectionRoute.listingPath}`,
    items,
  });
}

function findCollectionEntry<TEntry extends CollectionEntry<unknown>>(
  entries: TEntry[],
  slug: string,
  filter?: (e: TEntry) => boolean,
): TEntry | null {
  const filtered = filter ? entries.filter(filter) : entries;
  return filtered.find((e) => e.id === slug) ?? null;
}

export function createDualmarkRouteHandler(
  input: DualmarkNextConfig,
): DualmarkRouteHandler {
  const resolved = resolveConfig(input);
  const collectionRoutes = buildCollectionRoutes(resolved);
  const staticRoutes = buildStaticRoutes(resolved);
  const paramRoutes = buildParamRoutes(resolved);

  const responseOptions: MarkdownResponseOptions = {
    cacheControl: resolved.headers.cacheControl,
    noindex: resolved.headers.noindex,
    tokenizer: resolved.tokenizer,
  };

  async function dispatch(joined: string): Promise<Response> {
    for (const sr of staticRoutes) {
      const target = sr.pattern === "/" ? "/index" : sr.pattern;
      if (joined === target) {
        const body = await sr.config.render();
        return markdownResponse(body, responseOptions);
      }
    }

    for (const cr of collectionRoutes) {
      const c = cr.config;
      const emitListing = c.emitListing !== false;
      if (emitListing && joined === cr.listingPath) {
        const entries = await c.getEntries();
        const filtered = c.filter ? entries.filter(c.filter) : entries;
        const body = makeListingMarkdown(cr, filtered, resolved.siteUrl);
        return markdownResponse(body, responseOptions);
      }
      if (joined.startsWith(cr.detailPrefix)) {
        const slug = joined.slice(cr.detailPrefix.length);
        if (slug === "") continue;
        const entries = await c.getEntries();
        const entry = findCollectionEntry(entries, slug, c.filter);
        if (!entry) return new Response("Not Found", { status: 404 });
        const body = cr.converter(entry);
        return markdownResponse(body, responseOptions);
      }
    }

    for (const pr of paramRoutes) {
      const m = pr.regex.exec(joined);
      if (!m) continue;
      const params: Record<string, string> = {};
      pr.keys.forEach((k, i) => {
        const v = m[i + 1];
        if (v !== undefined) params[k] = v;
      });
      const body = await pr.config.render({ params });
      return markdownResponse(body, responseOptions);
    }

    return new Response("Not Found", { status: 404 });
  }

  return {
    async GET(_req, ctx) {
      const params = await Promise.resolve(ctx.params);
      const path = params?.path ?? [];
      const joined = joinPath(path);
      return dispatch(joined);
    },

    async generateStaticParams() {
      const out: Array<{ path: string[] }> = [];

      for (const sr of staticRoutes) {
        const target = sr.pattern === "/" ? "/index" : sr.pattern;
        out.push({ path: pathToParts(target) });
      }

      for (const cr of collectionRoutes) {
        const c = cr.config;
        const entries = await c.getEntries();
        const filtered = c.filter ? entries.filter(c.filter) : entries;
        if (c.emitListing !== false) {
          out.push({ path: pathToParts(cr.listingPath) });
        }
        for (const e of filtered) {
          out.push({ path: [...pathToParts(cr.listingPath), e.id] });
        }
      }

      for (const pr of paramRoutes) {
        const paths = await Promise.resolve(pr.config.getStaticPaths());
        for (const p of paths) {
          let resolvedPattern = pr.config.pattern;
          for (const [k, v] of Object.entries(p.params)) {
            resolvedPattern = resolvedPattern.replace(`[${k}]`, v);
          }
          out.push({ path: pathToParts(resolvedPattern) });
        }
      }

      return out;
    },
  };
}
