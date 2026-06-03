import type { DualmarkAstroConfig, ResolvedDualmarkConfig } from "./types.js";

export class DualmarkConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DualmarkConfigError";
  }
}

function formatError(msg: string, filePath?: string): string {
  return filePath ? `[${filePath}] Dualmark config error: ${msg}` : `Dualmark config error: ${msg}`;
}

export function resolveConfig(
  input: DualmarkAstroConfig,
  filePath?: string,
): ResolvedDualmarkConfig {
  if (!input || typeof input !== "object") {
    throw new DualmarkConfigError(formatError("Config must be an object", filePath));
  }
  if (typeof input.siteUrl !== "string" || !input.siteUrl) {
    throw new DualmarkConfigError(
      formatError("siteUrl is required (e.g., 'https://example.com')", filePath),
    );
  }
  try {
    new URL(input.siteUrl);
  } catch {
    throw new DualmarkConfigError(
      formatError(`siteUrl is not a valid URL: '${input.siteUrl}'`, filePath),
    );
  }
  if (input.siteUrl.endsWith("/")) {
    throw new DualmarkConfigError(
      formatError(`siteUrl must not end with '/': '${input.siteUrl}'`, filePath),
    );
  }
  const collections = input.collections ?? {};
  for (const [name, c] of Object.entries(collections)) {
    if (!c.converter) {
      throw new DualmarkConfigError(
        formatError(`Collection '${name}' is missing 'converter'`, filePath),
      );
    }
    if (c.route && c.route.startsWith("/")) {
      throw new DualmarkConfigError(
        formatError(
          `Collection '${name}' route should not start with '/' (got '${c.route}')`,
          filePath,
        ),
      );
    }
  }
  const staticPages = input.staticPages ?? [];
  for (const sp of staticPages) {
    if (!sp.pattern.startsWith("/")) {
      throw new DualmarkConfigError(
        formatError(`staticPages.pattern must start with '/' (got '${sp.pattern}')`, filePath),
      );
    }
    if (typeof sp.render !== "function") {
      throw new DualmarkConfigError(
        formatError(`staticPages.render for '${sp.pattern}' must be a function`, filePath),
      );
    }
  }
  const parameterizedRoutes = input.parameterizedRoutes ?? [];
  for (const pr of parameterizedRoutes) {
    if (!pr.pattern.includes("[")) {
      throw new DualmarkConfigError(
        formatError(
          `parameterizedRoutes.pattern must contain at least one [param] (got '${pr.pattern}')`,
          filePath,
        ),
      );
    }
  }
  return {
    siteUrl: input.siteUrl,
    collections,
    staticPages,
    parameterizedRoutes,
    llmsTxt: input.llmsTxt,
    middleware: {
      injectLinkHeader: input.middleware?.injectLinkHeader !== false,
    },
    headers: {
      cacheControl: input.headers?.cacheControl ?? "public, max-age=3600",
      noindex: input.headers?.noindex !== false,
    },
  };
}
