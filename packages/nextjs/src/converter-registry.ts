/**
 * Built-in converter resolver. Identical surface to `@dualmark/astro`'s
 * `resolveBuiltInConverter` so users can copy their `converter:` config
 * across frameworks unchanged.
 */
import {
  apiReferenceConverter,
  blogConverter,
  caseStudyConverter,
  changelogConverter,
  compareConverter,
  docsConverter,
  featureConverter,
  glossaryConverter,
  integrationConverter,
  legalConverter,
  pricingConverter,
  pseoConverter,
  statusPageConverter,
  toolConverter,
  videoConverter,
  type BaseConverterConfig,
  type CollectionEntry,
  type Converter,
} from "@dualmark/converters";

export type BuiltInConverterName =
  | "api-reference"
  | "blog"
  | "case-study"
  | "changelog"
  | "compare"
  | "docs"
  | "feature"
  | "glossary"
  | "integration"
  | "legal"
  | "pricing"
  | "pseo"
  | "status-page"
  | "tool"
  | "video";

export interface ResolveConverterArgs {
  name: string;
  collectionName: string;
  baseConfig: BaseConverterConfig;
}

export function resolveBuiltInConverter(
  args: ResolveConverterArgs,
): Converter<CollectionEntry<unknown>> {
  const basePath = `/${args.collectionName}`;
  const cfg = { ...args.baseConfig, basePath };
  switch (args.name as BuiltInConverterName) {
    case "api-reference":
      return apiReferenceConverter(cfg) as Converter<CollectionEntry<unknown>>;
    case "blog":
      return blogConverter(cfg) as Converter<CollectionEntry<unknown>>;
    case "case-study":
      return caseStudyConverter(cfg) as Converter<CollectionEntry<unknown>>;
    case "changelog":
      return changelogConverter(cfg) as Converter<CollectionEntry<unknown>>;
    case "compare":
      return compareConverter({ ...cfg, ourBrandColumn: "Us" }) as Converter<
        CollectionEntry<unknown>
      >;
    case "docs":
      return docsConverter(cfg) as Converter<CollectionEntry<unknown>>;
    case "feature":
      return featureConverter(cfg) as Converter<CollectionEntry<unknown>>;
    case "glossary":
      return glossaryConverter(cfg) as Converter<CollectionEntry<unknown>>;
    case "integration":
      return integrationConverter(cfg) as Converter<CollectionEntry<unknown>>;
    case "legal":
      return legalConverter(cfg) as Converter<CollectionEntry<unknown>>;
    case "pricing":
      return pricingConverter(cfg) as Converter<CollectionEntry<unknown>>;
    case "pseo":
      return pseoConverter(cfg) as Converter<CollectionEntry<unknown>>;
    case "status-page":
      return statusPageConverter(cfg) as Converter<CollectionEntry<unknown>>;
    case "tool":
      return toolConverter(cfg) as Converter<CollectionEntry<unknown>>;
    case "video":
      return videoConverter(cfg) as Converter<CollectionEntry<unknown>>;
    default:
      throw new Error(
        `Dualmark: unknown built-in converter '${args.name}'. Valid names: api-reference, blog, case-study, changelog, compare, docs, feature, glossary, integration, legal, pricing, pseo, status-page, tool, video. Or pass a function.`,
      );
  }
}
