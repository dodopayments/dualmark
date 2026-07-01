import { describe, it, expect } from "vitest";
import {
  normalizeUnicode,
  cleanBody,
  stripImages,
  slugToTitle,
  fmtDate,
  joinLines,
} from "../src/text.js";

describe("normalizeUnicode", () => {
  it("removes zero-width and BOM characters", () => {
    expect(normalizeUnicode("a\u200Bb\u200Cc\u200Dd\uFEFFe")).toBe("abcde");
  });

  it("converts curly quotes to ASCII", () => {
    expect(normalizeUnicode("\u2018hello\u2019 \u201Cworld\u201D")).toBe("'hello' \"world\"");
  });

  it("converts en/em dashes", () => {
    expect(normalizeUnicode("a\u2013b\u2014c")).toBe("a-b--c");
  });

  it("converts ellipsis", () => {
    expect(normalizeUnicode("wait\u2026")).toBe("wait...");
  });

  it("converts NBSP variants to space", () => {
    expect(normalizeUnicode("a\u00A0b\u200Ac\u202Fd")).toBe("a b c d");
  });

  it("converts arrows", () => {
    expect(normalizeUnicode("a\u2192b\u2190c")).toBe("a->b<-c");
  });

  it("converts math operators", () => {
    expect(normalizeUnicode("3\u00D74=12")).toBe("3x4=12");
    expect(normalizeUnicode("10\u00F72=5")).toBe("10/2=5");
    expect(normalizeUnicode("\u22483")).toBe("~=3");
    expect(normalizeUnicode("\u22655")).toBe(">=5");
  });

  it("converts currency symbols", () => {
    expect(normalizeUnicode("\u00A310")).toBe("GBP 10");
    expect(normalizeUnicode("\u20AC50")).toBe("EUR 50");
    expect(normalizeUnicode("\u20B9100")).toBe("INR 100");
    expect(normalizeUnicode("\u00A599")).toBe("JPY 99");
  });

  it("converts mathematical bold sans-serif letters and digits", () => {
    expect(normalizeUnicode("\u{1D5D4}\u{1D5D5}\u{1D5D6}")).toBe("ABC");
    expect(normalizeUnicode("\u{1D5EE}\u{1D5EF}\u{1D5F0}")).toBe("abc");
    expect(normalizeUnicode("\u{1D7EC}\u{1D7ED}\u{1D7EE}")).toBe("012");
  });

  it("preserves emoji and accented Latin", () => {
    expect(normalizeUnicode("café 🚀")).toBe("café 🚀");
  });

  it("handles empty string", () => {
    expect(normalizeUnicode("")).toBe("");
  });
});

describe("stripImages", () => {
  it("removes image syntax keeping alt text when present", () => {
    expect(stripImages("![alt text](img.png)")).toBe("alt text");
  });
  it("removes image syntax entirely when alt is empty", () => {
    expect(stripImages("![](img.png)")).toBe("");
  });
  it("preserves surrounding text", () => {
    expect(stripImages("before ![x](a.png) after")).toBe("before x after");
  });
  it("handles multiple images", () => {
    expect(stripImages("![a](1.png) and ![b](2.png)")).toBe("a and b");
  });
});

describe("cleanBody", () => {
  it("strips images by default", () => {
    expect(cleanBody("![alt](img.png) text")).toBe("alt text");
  });

  it("converts <Highlighted> to bold", () => {
    expect(cleanBody("see <Highlighted>this</Highlighted>")).toBe("see **this**");
  });

  it("converts a tag whose content spans multiple lines", () => {
    expect(cleanBody("see <Highlighted>multi\nline</Highlighted> end")).toBe(
      "see **multi\nline** end",
    );
  });

  it("keeps tag replacement lazy across multiple tags", () => {
    expect(cleanBody("<Em>a</Em> mid <Em>b</Em>", { htmlTagReplacements: { Em: "*" } })).toBe(
      "*a* mid *b*",
    );
  });

  it("converts <br> to newline", () => {
    expect(cleanBody("line1<br>line2<br/>line3")).toBe("line1\nline2\nline3");
  });

  it("collapses 3+ blank lines to 2", () => {
    expect(cleanBody("a\n\n\n\nb")).toBe("a\n\nb");
  });

  it("trims output", () => {
    expect(cleanBody("\n\n hello \n\n")).toBe("hello");
  });

  it("respects opts.stripImages=false", () => {
    expect(cleanBody("![a](b.png)", { stripImages: false })).toBe("![a](b.png)");
  });

  it("supports custom html tag replacements", () => {
    expect(
      cleanBody("<Em>x</Em>", {
        htmlTagReplacements: { Em: "_" },
      }),
    ).toBe("_x_");
  });

  it("respects opts.collapseBlankLines=false", () => {
    expect(cleanBody("a\n\n\nb", { collapseBlankLines: false })).toBe("a\n\n\nb");
  });
});

describe("slugToTitle", () => {
  it("capitalizes each hyphen-separated word", () => {
    expect(slugToTitle("hello-world")).toBe("Hello World");
  });
  it("handles single word", () => {
    expect(slugToTitle("hello")).toBe("Hello");
  });
  it("handles empty string", () => {
    expect(slugToTitle("")).toBe("");
  });
  it("handles multiple hyphens", () => {
    expect(slugToTitle("a-b-c-d")).toBe("A B C D");
  });
  it("handles leading/trailing hyphens", () => {
    expect(slugToTitle("-foo-bar-")).toBe("Foo Bar");
  });
});

describe("fmtDate", () => {
  it("formats Date as YYYY-MM-DD", () => {
    expect(fmtDate(new Date("2026-05-04T12:00:00Z"))).toBe("2026-05-04");
  });
  it("handles dates near year boundary in UTC", () => {
    expect(fmtDate(new Date("2025-12-31T23:59:59Z"))).toBe("2025-12-31");
  });
});

describe("joinLines", () => {
  it("joins string parts with newline", () => {
    expect(joinLines("a", "b", "c")).toBe("a\nb\nc");
  });
  it("filters out falsy values", () => {
    expect(joinLines("a", false, null, undefined, "b")).toBe("a\nb");
  });
  it("normalizes Unicode in output", () => {
    expect(joinLines("\u201Chi\u201D")).toBe('"hi"');
  });
});
