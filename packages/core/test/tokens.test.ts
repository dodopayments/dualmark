import { describe, it, expect, afterEach } from "vitest";
import { estimateTokens, setTokenEstimator, resetTokenEstimator } from "../src/tokens.js";

describe("estimateTokens", () => {
  afterEach(() => resetTokenEstimator());

  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });
  it("returns 0 for whitespace only", () => {
    expect(estimateTokens("   \n\t  ")).toBe(0);
  });
  it("counts whitespace-separated words", () => {
    expect(estimateTokens("hello world foo")).toBe(3);
  });
  it("treats newlines and tabs as separators", () => {
    expect(estimateTokens("a\nb\tc")).toBe(3);
  });
  it("collapses multiple separators", () => {
    expect(estimateTokens("a    b\n\nc")).toBe(3);
  });
});

describe("setTokenEstimator / resetTokenEstimator", () => {
  afterEach(() => resetTokenEstimator());

  it("uses custom estimator", () => {
    setTokenEstimator((t) => t.length);
    expect(estimateTokens("hello")).toBe(5);
  });

  it("resets to default", () => {
    setTokenEstimator((t) => t.length);
    expect(estimateTokens("hi")).toBe(2);
    resetTokenEstimator();
    expect(estimateTokens("hi")).toBe(1);
  });
});

describe("estimateTokens with inline tokenizer option", () => {
  afterEach(() => resetTokenEstimator());

  it("uses inline tokenizer when provided", () => {
    const charCounter = (t: string) => t.length;
    expect(estimateTokens("hello", { tokenizer: charCounter })).toBe(5);
  });

  it("inline tokenizer takes precedence over global setTokenEstimator", () => {
    setTokenEstimator(() => 999);
    const charCounter = (t: string) => t.length;
    expect(estimateTokens("hi", { tokenizer: charCounter })).toBe(2);
  });

  it("falls back to global estimator when inline tokenizer is omitted", () => {
    setTokenEstimator(() => 42);
    expect(estimateTokens("anything")).toBe(42);
  });

  it("falls back to default when no inline tokenizer and no global override", () => {
    expect(estimateTokens("one two three")).toBe(3);
  });

  it("handles empty options object", () => {
    expect(estimateTokens("a b c", {})).toBe(3);
  });
});
