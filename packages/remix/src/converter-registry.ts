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
  basePath?: string;
}

export function resolveBuiltInConverter(
  args: ResolveConverterArgs,
): Converter<CollectionEntry<unknown>> {
  const config = { ...args.baseConfig, basePath: args.basePath ?? `/${args.collectionName}` };
  switch (args.name as BuiltInConverterName) {
    case "api-reference":
      return apiReferenceConverter(config) as Converter<CollectionEntry<unknown>>;
    case "blog":
      return blogConverter(config) as Converter<CollectionEntry<unknown>>;
    case "case-study":
      return caseStudyConverter(config) as Converter<CollectionEntry<unknown>>;
    case "changelog":
      return changelogConverter(config) as Converter<CollectionEntry<unknown>>;
    case "compare":
      return compareConverter({ ...config, ourBrandColumn: "Us" }) as Converter<
        CollectionEntry<unknown>
      >;
    case "docs":
      return docsConverter(config) as Converter<CollectionEntry<unknown>>;
    case "feature":
      return featureConverter(config) as Converter<CollectionEntry<unknown>>;
    case "glossary":
      return glossaryConverter(config) as Converter<CollectionEntry<unknown>>;
    case "integration":
      return integrationConverter(config) as Converter<CollectionEntry<unknown>>;
    case "legal":
      return legalConverter(config) as Converter<CollectionEntry<unknown>>;
    case "pricing":
      return pricingConverter(config) as Converter<CollectionEntry<unknown>>;
    case "pseo":
      return pseoConverter(config) as Converter<CollectionEntry<unknown>>;
    case "status-page":
      return statusPageConverter(config) as Converter<CollectionEntry<unknown>>;
    case "tool":
      return toolConverter(config) as Converter<CollectionEntry<unknown>>;
    case "video":
      return videoConverter(config) as Converter<CollectionEntry<unknown>>;
    default:
      throw new Error(
        `Dualmark: unknown built-in converter '${args.name}'. Valid names: api-reference, blog, case-study, changelog, compare, docs, feature, glossary, integration, legal, pricing, pseo, status-page, tool, video. Or pass a function.`,
      );
  }
}
