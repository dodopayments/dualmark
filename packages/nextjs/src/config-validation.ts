import type { DualmarkNextConfig, ResolvedDualmarkNextConfig } from "./types.js";

export class DualmarkConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DualmarkConfigError";
  }
}

const RESERVED_NAMESPACES = new Set(["", "/", "_next", "api"]);

/**
 * Validate and normalize a `DualmarkNextConfig`. Throws `DualmarkConfigError`
 * with a human-readable message on any invariant violation, so misconfiguration
 * fails fast at app boot rather than silently producing wrong markdown.
 */
export function resolveConfig(input: DualmarkNextConfig): ResolvedDualmarkNextConfig {
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
    throw new DualmarkConfigError(
      `Dualmark config: siteUrl is not a valid URL: ${input.siteUrl}`,
    );
  }
  if (input.siteUrl.endsWith("/")) {
    throw new DualmarkConfigError(
      `Dualmark config: siteUrl must not end with '/': ${input.siteUrl}`,
    );
  }

  const internalNamespaceRaw = input.internalNamespace ?? "md";
  const internalNamespace = internalNamespaceRaw.replace(/^\/+|\/+$/g, "");
  if (RESERVED_NAMESPACES.has(internalNamespace)) {
    throw new DualmarkConfigError(
      `Dualmark config: internalNamespace '${internalNamespaceRaw}' is reserved`,
    );
  }
  if (!/^[a-z0-9_-]+$/i.test(internalNamespace)) {
    throw new DualmarkConfigError(
      `Dualmark config: internalNamespace must match /^[a-z0-9_-]+$/i (got '${internalNamespaceRaw}')`,
    );
  }

  const collections = input.collections ?? {};
  for (const [name, c] of Object.entries(collections)) {
    if (!c.converter) {
      throw new DualmarkConfigError(
        `Dualmark config: collection '${name}' is missing 'converter'`,
      );
    }
    if (typeof c.getEntries !== "function") {
      throw new DualmarkConfigError(
        `Dualmark config: collection '${name}' is missing 'getEntries' function`,
      );
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
  }

  return {
    siteUrl: input.siteUrl,
    internalNamespace,
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
