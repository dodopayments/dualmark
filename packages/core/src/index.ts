export {
  parseAcceptHeader,
  mediaTypeMatches,
  negotiateFormat,
  type ParsedMediaType,
} from "./negotiation.js";

export {
  estimateTokens,
  setTokenEstimator,
  resetTokenEstimator,
  type TokenEstimator,
  type EstimateTokensOptions,
} from "./tokens.js";

export {
  normalizeUnicode,
  cleanBody,
  slugToTitle,
  fmtDate,
  joinLines,
  type CleanBodyOptions,
} from "./text.js";

export {
  markdownResponse,
  injectMarkdownAlternateLink,
  type MarkdownResponseOptions,
} from "./markdown.js";

export { toMarkdownPath, toMarkdownUrl } from "./paths.js";

export {
  AI_BOTS,
  detectAIBot,
  type AIBotEntry,
  type AIBotInfo,
  type BotPurpose,
} from "./bots.js";

export {
  listingToMarkdown,
  renderRelatedLinks,
  renderFAQSection,
  type ListingItem,
  type ListingOptions,
  type RelatedLinks,
  type RelatedLinksGroup,
  type FAQItem,
  type PlatformFooter,
} from "./composition.js";

export {
  renderLlmsTxt,
  type LlmsTxtSection,
  type LlmsTxtOptions,
} from "./llms-txt.js";

export type {
  TrailingSlashMode,
  AIRequestInfo,
  MissInfo,
} from "./analytics.js";

export const AEO_SPEC_VERSION = "1.0";
