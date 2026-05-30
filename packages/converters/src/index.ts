export { blogConverter, type BlogConverterConfig, type BlogEntryData } from "./blog.js";
export {
  caseStudyConverter,
  type CaseStudyConverterConfig,
  type CaseStudyEntryData,
} from "./case-study.js";
export {
  glossaryConverter,
  type GlossaryConverterConfig,
  type GlossaryEntryData,
} from "./glossary.js";
export {
  integrationConverter,
  type IntegrationConverterConfig,
  type IntegrationEntryData,
} from "./integration.js";
export { legalConverter, type LegalConverterConfig, type LegalEntryData } from "./legal.js";
export { compareConverter, type CompareConverterConfig, type CompareEntryData } from "./compare.js";
export { toolConverter, type ToolConverterConfig, type ToolEntryData } from "./tool.js";
export { videoConverter, type VideoConverterConfig, type VideoEntryData } from "./video.js";
export {
  featureConverter,
  type FeatureConverterConfig,
  type FeatureEntryData,
  type FeatureSection,
  type FeatureRelatedLink,
} from "./feature.js";
export {
  pseoConverter,
  type PseoConverterConfig,
  type PseoEntryData,
  type PseoFact,
  type PseoRelatedGroup,
} from "./pseo.js";
export {
  changelogConverter,
  type ChangelogConverterConfig,
  type ChangelogEntryData,
  type ChangelogChange,
  type ChangelogChangeType,
} from "./changelog.js";
export {
  statusPageConverter,
  type StatusPageConverterConfig,
  type StatusPageEntryData,
  type StatusPageComponent,
  type StatusPageIncident,
  type StatusPageOverallStatus,
} from "./status-page.js";
export {
  pricingConverter,
  type PricingConverterConfig,
  type PricingEntryData,
  type PricingTier,
} from "./pricing.js";
export { docsConverter, type DocsConverterConfig, type DocsEntryData } from "./docs.js";

export type {
  BaseConverterConfig,
  CollectionEntry,
  Converter,
  ConverterFactory,
  RelatedLinkRef,
} from "./types.js";

export const BUILT_IN_CONVERTERS = [
  "blog",
  "case-study",
  "changelog",
  "compare",
  "docs",
  "feature",
  "glossary",
  "integration",
  "legal",
  "pricing",
  "pseo",
  "status-page",
  "tool",
  "video",
] as const;

export type BuiltInConverterName = (typeof BUILT_IN_CONVERTERS)[number];
