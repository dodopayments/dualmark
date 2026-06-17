import type { DualmarkNuxtConfig, ResolvedDualmarkConfig } from "./types.js";

export class DualmarkConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DualmarkConfigError";
  }
}

export function resolveConfig(input: DualmarkNuxtConfig): ResolvedDualmarkConfig {
  if (!input || typeof input !== "object") {
    throw new DualmarkConfigError("Dualmark config must be an object");
  }
  if (typeof input.siteUrl !== "string" || !input.siteUrl) {
    throw new DualmarkConfigError("Dualmark config: siteUrl is required (e.g. 'https://example.com')");
  }
  try {
    new URL(input.siteUrl);
  } catch {
    throw new DualmarkConfigError(`Dualmark config: siteUrl is not a valid URL: ${input.siteUrl}`);
  }
  if (input.siteUrl.endsWith("/")) {
    throw new DualmarkConfigError(`Dualmark config: siteUrl must not end with '/': ${input.siteUrl}`);
  }

  const collections = input.collections ?? {};
  for (const [name, c] of Object.entries(collections)) {
    if (!c.converter) {
      throw new DualmarkConfigError(`Dualmark config: collection '${name}' is missing 'converter'`);
    }
    if (c.route && c.route.startsWith("/")) {
      throw new DualmarkConfigError(
        `Dualmark config: collection '${name}' route should not start with '/' (got '${c.route}')`,
      );
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
    if (!pr.pattern.includes("[")) {
      throw new DualmarkConfigError(
        `Dualmark config: parameterizedRoutes.pattern must contain at least one [param] (got '${pr.pattern}')`,
      );
    }
  }

  if (typeof input.tokenizer === "string") {
    if (!input.tokenizer) {
      throw new DualmarkConfigError("Dualmark config: tokenizer module path must not be empty");
    }
    if (!input.tokenizer.startsWith("./") && !input.tokenizer.startsWith("../")) {
      throw new DualmarkConfigError(
        `Dualmark config: tokenizer module path must be a relative path starting with './' or '../' (got '${input.tokenizer}')`,
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
    tokenizer: input.tokenizer,
  };
}
