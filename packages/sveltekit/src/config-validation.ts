import type { DualmarkSvelteKitConfig, ResolvedDualmarkSvelteKitConfig } from "./types.js";

export class DualmarkConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DualmarkConfigError";
  }
}

const DEFAULT_CONFIG_PATH = "src/dualmark.config.ts";
const DEFAULT_ROUTES_DIR = "src/routes";

export function resolveConfig(input: DualmarkSvelteKitConfig): ResolvedDualmarkSvelteKitConfig {
  if (!input || typeof input !== "object") {
    throw new DualmarkConfigError("Dualmark config must be an object");
  }
  if (typeof input.siteUrl !== "string" || !input.siteUrl) {
    throw new DualmarkConfigError(
      "Dualmark config: siteUrl is required (e.g. 'https://example.com')",
    );
  }
  try {
    new URL(input.siteUrl);
  } catch {
    throw new DualmarkConfigError(`Dualmark config: siteUrl is not a valid URL: ${input.siteUrl}`);
  }
  if (input.siteUrl.endsWith("/")) {
    throw new DualmarkConfigError(
      `Dualmark config: siteUrl must not end with '/': ${input.siteUrl}`,
    );
  }

  const configPath = input.configPath ?? DEFAULT_CONFIG_PATH;
  if (configPath.startsWith("/") || configPath.includes("..")) {
    throw new DualmarkConfigError(
      `Dualmark config: configPath must be project-relative (got '${configPath}')`,
    );
  }

  const routesDir = input.routesDir ?? DEFAULT_ROUTES_DIR;
  if (routesDir.startsWith("/") || routesDir.includes("..")) {
    throw new DualmarkConfigError(
      `Dualmark config: routesDir must be project-relative (got '${routesDir}')`,
    );
  }

  const collections = input.collections ?? {};
  for (const [name, c] of Object.entries(collections)) {
    if (!c.converter) {
      throw new DualmarkConfigError(`Dualmark config: collection '${name}' is missing 'converter'`);
    }
    if (typeof c.getEntries !== "function") {
      throw new DualmarkConfigError(
        `Dualmark config: collection '${name}' is missing 'getEntries' function`,
      );
    }
    if (c.route !== undefined) {
      if (c.route.startsWith("/")) {
        throw new DualmarkConfigError(
          `Dualmark config: collection '${name}' route should not start with '/' (got '${c.route}')`,
        );
      }
      if (c.route.length === 0) {
        throw new DualmarkConfigError(
          `Dualmark config: collection '${name}' route must not be empty`,
        );
      }
    }
  }

  const staticPages = input.staticPages ?? [];
  for (const sp of staticPages) {
    if (!sp.pattern.startsWith("/")) {
      throw new DualmarkConfigError(
        `Dualmark config: staticPages.pattern must start with '/' (got '${sp.pattern}')`,
      );
    }
    if (typeof sp.render !== "function") {
      throw new DualmarkConfigError(
        `Dualmark config: staticPages.render for '${sp.pattern}' must be a function`,
      );
    }
  }

  const parameterizedRoutes = input.parameterizedRoutes ?? [];
  for (const pr of parameterizedRoutes) {
    if (!pr.pattern.startsWith("/")) {
      throw new DualmarkConfigError(
        `Dualmark config: parameterizedRoutes.pattern must start with '/' (got '${pr.pattern}')`,
      );
    }
    if (!pr.pattern.includes("[")) {
      throw new DualmarkConfigError(
        `Dualmark config: parameterizedRoutes.pattern must contain at least one [param] (got '${pr.pattern}')`,
      );
    }
    if (typeof pr.getStaticPaths !== "function") {
      throw new DualmarkConfigError(
        `Dualmark config: parameterizedRoutes.getStaticPaths for '${pr.pattern}' must be a function`,
      );
    }
    if (typeof pr.render !== "function") {
      throw new DualmarkConfigError(
        `Dualmark config: parameterizedRoutes.render for '${pr.pattern}' must be a function`,
      );
    }
  }

  return {
    siteUrl: input.siteUrl,
    configPath,
    routesDir,
    collections,
    staticPages,
    parameterizedRoutes,
    llmsTxt: input.llmsTxt,
    middleware: {
      injectLinkHeader: input.middleware?.injectLinkHeader !== false,
      skipPaths: input.middleware?.skipPaths ?? [],
    },
    appDir: input.appDir ?? "_app",
    headers: {
      cacheControl: input.headers?.cacheControl ?? "public, max-age=3600",
      noindex: input.headers?.noindex !== false,
    },
  };
}
