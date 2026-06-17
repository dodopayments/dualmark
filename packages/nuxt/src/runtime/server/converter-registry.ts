import {
  blogConverter,
  caseStudyConverter,
  changelogConverter,
  compareConverter,
  docsConverter,
  featureConverter,
  glossaryConverter,
  legalConverter,
  pricingConverter,
  pseoConverter,
  toolConverter,
  videoConverter,
  type BaseConverterConfig,
  type CollectionEntry,
  type Converter,
} from "@dualmark/converters";

export type BuiltInConverterName =
  | "blog"
  | "case-study"
  | "changelog"
  | "compare"
  | "docs"
  | "feature"
  | "glossary"
  | "legal"
  | "pricing"
  | "pseo"
  | "tool"
  | "video";

export interface ResolveConverterArgs {
  name: string;
  collectionName: string;
  baseConfig: BaseConverterConfig;
  compareOptions?: {
    ourBrandColumn?: string;
  };
}

export function resolveBuiltInConverter(
  args: ResolveConverterArgs,
): Converter<CollectionEntry<unknown>> {
  const basePath = `/${args.collectionName}`;
  const cfg = { ...args.baseConfig, basePath };
  switch (args.name as BuiltInConverterName) {
    case "blog":
      return blogConverter(cfg) as Converter<CollectionEntry<unknown>>;
    case "case-study":
      return caseStudyConverter(cfg) as Converter<CollectionEntry<unknown>>;
    case "changelog":
      return changelogConverter(cfg) as Converter<CollectionEntry<unknown>>;
    case "compare":
      return compareConverter({
        ...cfg,
        ourBrandColumn: args.compareOptions?.ourBrandColumn ?? "Us",
      }) as Converter<CollectionEntry<unknown>>;
    case "docs":
      return docsConverter(cfg) as Converter<CollectionEntry<unknown>>;
    case "feature":
      return featureConverter(cfg) as Converter<CollectionEntry<unknown>>;
    case "glossary":
      return glossaryConverter(cfg) as Converter<CollectionEntry<unknown>>;
    case "legal":
      return legalConverter(cfg) as Converter<CollectionEntry<unknown>>;
    case "pricing":
      return pricingConverter(cfg) as Converter<CollectionEntry<unknown>>;
    case "pseo":
      return pseoConverter(cfg) as Converter<CollectionEntry<unknown>>;
    case "tool":
      return toolConverter(cfg) as Converter<CollectionEntry<unknown>>;
    case "video":
      return videoConverter(cfg) as Converter<CollectionEntry<unknown>>;
    default:
      throw new Error(
        `Dualmark: unknown built-in converter '${args.name}'. Valid names: blog, case-study, changelog, compare, docs, feature, glossary, legal, pricing, pseo, tool, video. Or pass a function.`,
      );
  }
}
