import { describe, it, expect } from "vitest";
import * as core from "../src/index.js";

describe("@dualmark/core public surface", () => {
  it("exports content-negotiation API", () => {
    expect(typeof core.parseAcceptHeader).toBe("function");
    expect(typeof core.mediaTypeMatches).toBe("function");
    expect(typeof core.negotiateFormat).toBe("function");
  });

  it("exports token API", () => {
    expect(typeof core.estimateTokens).toBe("function");
    expect(typeof core.setTokenEstimator).toBe("function");
    expect(typeof core.resetTokenEstimator).toBe("function");
  });

  it("exports text API", () => {
    expect(typeof core.normalizeUnicode).toBe("function");
    expect(typeof core.cleanBody).toBe("function");
    expect(typeof core.slugToTitle).toBe("function");
    expect(typeof core.fmtDate).toBe("function");
    expect(typeof core.joinLines).toBe("function");
  });

  it("exports markdown response API", () => {
    expect(typeof core.markdownResponse).toBe("function");
    expect(typeof core.injectMarkdownAlternateLink).toBe("function");
  });

  it("exports path utilities", () => {
    expect(typeof core.toMarkdownPath).toBe("function");
    expect(typeof core.toMarkdownUrl).toBe("function");
  });

  it("exports bot detection API", () => {
    expect(typeof core.detectAIBot).toBe("function");
    expect(Array.isArray(core.AI_BOTS)).toBe(true);
  });

  it("exports composition API", () => {
    expect(typeof core.listingToMarkdown).toBe("function");
    expect(typeof core.renderRelatedLinks).toBe("function");
    expect(typeof core.renderFAQSection).toBe("function");
  });

  it("exports llms.txt API", () => {
    expect(typeof core.renderLlmsTxt).toBe("function");
  });

  it("exports AEO_SPEC_VERSION constant", () => {
    expect(core.AEO_SPEC_VERSION).toBe("1.0");
  });
});
