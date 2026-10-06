import { isAbsolute, win32 } from "node:path";
import type { DualmarkRemixConfig, ResolvedDualmarkRemixConfig } from "./types.js";

export class DualmarkConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DualmarkConfigError";
  }
}

const DEFAULT_CONFIG_PATH = "app/dualmark.config.ts";
const DEFAULT_GENERATED_DIR = "app/.dualmark-remix";

function validateProjectRelativePath(name: string, path: string): void {
  if (isAbsolute(path) || win32.isAbsolute(path) || path.includes("..")) {
    throw new DualmarkConfigError(
      `Dualmark config: ${name} must be project-relative (got '${path}')`,
    );
  }
}

export function resolveConfig(input: DualmarkRemixConfig): ResolvedDualmarkRemixConfig {
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
  validateProjectRelativePath("configPath", configPath);
  const generatedDir = input.generatedDir ?? DEFAULT_GENERATED_DIR;
  validateProjectRelativePath("generatedDir", generatedDir);

  const collections = input.collections ?? {};
  for (const [name, config] of Object.entries(collections)) {
    if (!config.converter) {
      throw new DualmarkConfigError(`Dualmark config: collection '${name}' is missing 'converter'`);
    }
    if (typeof config.getEntries !== "function") {
      throw new DualmarkConfigError(
        `Dualmark config: collection '${name}' is missing 'getEntries' function`,
      );
    }
    if (config.route !== undefined) {
      if (config.route.startsWith("/")) {
        throw new DualmarkConfigError(
          `Dualmark config: collection '${name}' route should not start with '/' (got '${config.route}')`,
        );
      }
      if (config.route.length === 0) {
        throw new DualmarkConfigError(
          `Dualmark config: collection '${name}' route must not be empty`,
        );
      }
      if (!/^[a-z0-9_/-]+$/i.test(config.route) || config.route.includes("..")) {
        throw new DualmarkConfigError(
          `Dualmark config: collection '${name}' route must be a safe URL path prefix (got '${config.route}')`,
        );
      }
    }
    if (config.slugStrategy === "catch-all") {
      throw new DualmarkConfigError(
        `Dualmark config: collection '${name}' slugStrategy 'catch-all' is not supported by @dualmark/remix yet; use 'single'`,
      );
    }
  }

  const staticPages = input.staticPages ?? [];
  for (const staticPage of staticPages) {
    if (!staticPage.pattern.startsWith("/")) {
      throw new DualmarkConfigError(
        `Dualmark config: staticPages.pattern must start with '/' (got '${staticPage.pattern}')`,
      );
    }
    if (typeof staticPage.render !== "function") {
      throw new DualmarkConfigError(
        `Dualmark config: staticPages.render for '${staticPage.pattern}' must be a function`,
      );
    }
    if (staticPage.pattern.includes("..") || staticPage.pattern.includes("\\")) {
      throw new DualmarkConfigError(
        `Dualmark config: staticPages.pattern must be a safe URL path (got '${staticPage.pattern}')`,
      );
    }
  }

  const parameterizedRoutes = input.parameterizedRoutes ?? [];
  for (const route of parameterizedRoutes) {
    if (!route.pattern.startsWith("/")) {
      throw new DualmarkConfigError(
        `Dualmark config: parameterizedRoutes.pattern must start with '/' (got '${route.pattern}')`,
      );
    }
    if (!route.pattern.includes("[")) {
      throw new DualmarkConfigError(
        `Dualmark config: parameterizedRoutes.pattern must contain at least one [param] (got '${route.pattern}')`,
      );
    }
    if (typeof route.getStaticPaths !== "function") {
      throw new DualmarkConfigError(
        `Dualmark config: parameterizedRoutes.getStaticPaths for '${route.pattern}' must be a function`,
      );
    }
    if (typeof route.render !== "function") {
      throw new DualmarkConfigError(
        `Dualmark config: parameterizedRoutes.render for '${route.pattern}' must be a function`,
      );
    }
    if (route.pattern.includes("..") || route.pattern.includes("\\")) {
      throw new DualmarkConfigError(
        `Dualmark config: parameterizedRoutes.pattern must be a safe URL path (got '${route.pattern}')`,
      );
    }
  }

  return {
    siteUrl: input.siteUrl,
    configPath,
    generatedDir,
    collections,
    staticPages,
    parameterizedRoutes,
    llmsTxt: input.llmsTxt,
    middleware: {
      injectLinkHeader: input.middleware?.injectLinkHeader !== false,
      skipPaths: input.middleware?.skipPaths ?? [],
    },
    headers: {
      cacheControl: input.headers?.cacheControl ?? "public, max-age=3600",
      noindex: input.headers?.noindex !== false,
    },
    tokenizer: input.tokenizer,
  };
}
