import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative, sep } from "node:path";
import { resolveConfig, DualmarkConfigError } from "./config-validation.js";
import type { DualmarkAstroConfig, ResolvedDualmarkConfig } from "./types.js";

interface AstroIntegrationLogger {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
}

interface InjectedRoute {
  pattern: string;
  entrypoint: string | URL;
  prerender?: boolean;
}

interface AstroIntegrationMiddleware {
  order: "pre" | "post";
  entrypoint: string | URL;
}

interface ConfigSetupHookOptions {
  config: { root: URL; srcDir?: URL };
  command: string;
  isRestart?: boolean;
  injectRoute: (route: InjectedRoute) => void;
  addMiddleware?: (mw: AstroIntegrationMiddleware) => void;
  logger: AstroIntegrationLogger;
  updateConfig?: (cfg: unknown) => unknown;
}

export interface AstroIntegrationLike {
  name: string;
  hooks: {
    "astro:config:setup": (opts: ConfigSetupHookOptions) => void | Promise<void>;
  };
}

const GENERATED_DIR_NAME = ".dualmark-generated";

interface RouteSpec {
  pattern: string;
  fileName: string;
  source: string;
}

function rel(from: string, to: string): string {
  const r = relative(from, to);
  return r.split(sep).join("/");
}

export function createDualmarkIntegration(input: DualmarkAstroConfig): AstroIntegrationLike {
  return {
    name: "@dualmark/astro",
    hooks: {
      "astro:config:setup"(opts) {
        const root = fileURLToPath(opts.config.root);

        const candidates = [
          "astro.config.ts",
          "astro.config.mjs",
          "astro.config.js",
          "astro.config.mts",
          "astro.config.cjs",
        ];
        const configPath =
          candidates.map((f) => join(root, f)).find(existsSync) ?? join(root, "astro.config.mjs");

        let resolved: ResolvedDualmarkConfig;
        try {
          resolved = resolveConfig(input, configPath);
        } catch (e) {
          opts.logger.error(`[@dualmark/astro] ${e instanceof Error ? e.message : String(e)}`);
          throw e;
        }

        const generatedDir = join(root, "node_modules", GENERATED_DIR_NAME);
        if (!existsSync(generatedDir)) mkdirSync(generatedDir, { recursive: true });

        writeFileSync(
          join(generatedDir, "config.mjs"),
          `export default ${JSON.stringify(
            {
              siteUrl: resolved.siteUrl,
              cacheControl: resolved.headers.cacheControl,
              noindex: resolved.headers.noindex,
            },
            null,
            2,
          )};\n`,
          "utf8",
        );

        const routes: RouteSpec[] = [];

        for (const [collectionName, c] of Object.entries(resolved.collections)) {
          const route = c.route ?? collectionName;
          const slugSeg = c.slugStrategy === "single" ? "[slug]" : "[...slug]";
          const detailPattern = `/${route}/${slugSeg}.md`;
          const listingPattern = `/${route}.md`;
          if (typeof c.converter !== "string") {
            opts.logger.warn(
              `[@dualmark/astro] Collection '${collectionName}' uses an inline converter function — this isn't yet serializable into a generated route. Use a built-in converter name (e.g. 'blog') for now.`,
            );
            continue;
          }
          const converterImport = `import { resolveBuiltInConverter } from "@dualmark/astro";`;
          const detailSource = `${converterImport}
import { makeCollectionDetailEndpoint } from "@dualmark/astro/endpoints/collection";
import { getCollection } from "astro:content";
import dualmarkConfig from "./config.mjs";

const converter = resolveBuiltInConverter({
  name: ${JSON.stringify(c.converter)},
  collectionName: ${JSON.stringify(collectionName)},
  baseConfig: { siteUrl: dualmarkConfig.siteUrl },
});

const endpoint = makeCollectionDetailEndpoint({
  collectionName: ${JSON.stringify(collectionName)},
  converter,
  getCollection: (name, filter) => getCollection(name, filter),
  responseOptions: { cacheControl: dualmarkConfig.cacheControl, noindex: dualmarkConfig.noindex },
});

export const getStaticPaths = endpoint.getStaticPaths;
export const GET = endpoint.GET;
`;

          const listingSource = `import { makeListingEndpoint } from "@dualmark/astro/endpoints/listing";
import { getCollection } from "astro:content";
import dualmarkConfig from "./config.mjs";

const endpoint = makeListingEndpoint({
  collectionName: ${JSON.stringify(collectionName)},
  siteUrl: dualmarkConfig.siteUrl,
  basePath: ${JSON.stringify("/" + route)},
  title: ${JSON.stringify(c.listingMetadata?.title ?? collectionName)},
  description: ${JSON.stringify(c.listingMetadata?.description ?? `All ${collectionName} entries.`)},
  getCollection: (name, filter) => getCollection(name, filter),
  responseOptions: { cacheControl: dualmarkConfig.cacheControl, noindex: dualmarkConfig.noindex },
});

export const GET = endpoint.GET;
`;

          routes.push({
            pattern: detailPattern,
            fileName: `collection-${collectionName}-detail.mjs`,
            source: detailSource,
          });
          if (c.emitListing !== false) {
            routes.push({
              pattern: listingPattern,
              fileName: `collection-${collectionName}-listing.mjs`,
              source: listingSource,
            });
          }
        }

        for (let i = 0; i < resolved.staticPages.length; i++) {
          const sp = resolved.staticPages[i];
          if (!sp) continue;
          const safe = sp.pattern.replace(/[^a-z0-9]/gi, "_");
          const fileName = `static-${i}-${safe}.mjs`;
          const renderModulePath = join(generatedDir, `static-${i}-${safe}-render.mjs`);
          writeFileSync(renderModulePath, `export default ${sp.render.toString()};\n`, "utf8");
          const source = `import { makeStaticEndpoint } from "@dualmark/astro/endpoints/static";
import dualmarkConfig from "./config.mjs";
import render from "./${rel(generatedDir, renderModulePath)}";

const endpoint = makeStaticEndpoint({
  render,
  responseOptions: { cacheControl: dualmarkConfig.cacheControl, noindex: dualmarkConfig.noindex },
});

export const GET = endpoint.GET;
`;
          const mdPattern =
            sp.pattern === "/" ? "/index.md" : sp.pattern.replace(/\/$/, "") + ".md";
          routes.push({ pattern: mdPattern, fileName, source });
        }

        for (let i = 0; i < resolved.parameterizedRoutes.length; i++) {
          const pr = resolved.parameterizedRoutes[i];
          if (!pr) continue;
          const safe = pr.pattern.replace(/[^a-z0-9]/gi, "_");
          const renderModulePath = join(generatedDir, `param-${i}-${safe}-render.mjs`);
          const pathsModulePath = join(generatedDir, `param-${i}-${safe}-paths.mjs`);
          writeFileSync(renderModulePath, `export default ${pr.render.toString()};\n`, "utf8");
          writeFileSync(
            pathsModulePath,
            `export default ${pr.getStaticPaths.toString()};\n`,
            "utf8",
          );
          const source = `import { makeParameterizedEndpoint } from "@dualmark/astro/endpoints/parameterized";
import dualmarkConfig from "./config.mjs";
import render from "./${rel(generatedDir, renderModulePath)}";
import getStaticPaths from "./${rel(generatedDir, pathsModulePath)}";

const endpoint = makeParameterizedEndpoint({
  getStaticPaths: () => getStaticPaths(),
  render,
  responseOptions: { cacheControl: dualmarkConfig.cacheControl, noindex: dualmarkConfig.noindex },
});

export const getStaticPaths = endpoint.getStaticPaths;
export const GET = endpoint.GET;
`;
          const pattern = pr.pattern.startsWith("/") ? pr.pattern + ".md" : `/${pr.pattern}.md`;
          routes.push({
            pattern,
            fileName: `param-${i}-${safe}.mjs`,
            source,
          });
        }

        if (resolved.llmsTxt?.enabled) {
          const sections = resolved.llmsTxt.sections ?? [];
          const source = `import { makeLlmsTxtEndpoint } from "@dualmark/astro/endpoints/llms-txt";

const endpoint = makeLlmsTxtEndpoint({
  brandName: ${JSON.stringify(resolved.llmsTxt.brandName ?? "Site")},
  description: ${JSON.stringify(resolved.llmsTxt.description ?? "")},
  sections: ${JSON.stringify(sections)},
});

export const GET = endpoint.GET;
`;
          routes.push({ pattern: "/llms.txt", fileName: `llms-txt.mjs`, source });
        }

        for (const r of routes) {
          const filePath = join(generatedDir, r.fileName);
          writeFileSync(filePath, r.source, "utf8");
          opts.injectRoute({
            pattern: r.pattern,
            entrypoint: filePath,
            prerender: true,
          });
        }

        if (resolved.middleware.injectLinkHeader && opts.addMiddleware) {
          opts.addMiddleware({
            order: "post",
            entrypoint: "@dualmark/astro/middleware",
          });
        }

        opts.logger.info(
          `[@dualmark/astro] Injected ${routes.length} route(s) and ${
            resolved.middleware.injectLinkHeader ? "1" : "0"
          } middleware`,
        );
      },
    },
  };
}

export default function dualmarkAstro(config: DualmarkAstroConfig): AstroIntegrationLike {
  return createDualmarkIntegration(config);
}
