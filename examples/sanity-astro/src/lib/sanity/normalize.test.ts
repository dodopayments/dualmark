import { describe, expect, it } from "vitest";
import { normalizeGlossaryTerm, normalizePost } from "./normalize";
import type { SanityGlossaryTerm, SanityPost } from "./types";

describe("Sanity content normalization", () => {
  it("maps Sanity posts to Dualmark blog converter fields", () => {
    const post: SanityPost = {
      _id: "post-1",
      _type: "post",
      title: "CMS-driven AEO",
      slug: { current: "cms-driven-aeo" },
      description: "How CMS content becomes markdown twins.",
      author: "Dodo Payments",
      publishedAt: "2026-06-01T00:00:00.000Z",
      category: ["AEO", "CMS"],
      body: [],
    };

    expect(normalizePost(post)).toEqual({
      id: "cms-driven-aeo",
      data: {
        title: "CMS-driven AEO",
        description: "How CMS content becomes markdown twins.",
        author: "Dodo Payments",
        publishedDate: new Date("2026-06-01T00:00:00.000Z"),
        modifiedDate: undefined,
        category: ["AEO", "CMS"],
      },
    });
  });

  it("maps Sanity modifiedAt to Dualmark modifiedDate", () => {
    const post: SanityPost = {
      _id: "post-1",
      _type: "post",
      title: "CMS-driven AEO",
      slug: { current: "cms-driven-aeo" },
      publishedAt: "2026-06-01T00:00:00.000Z",
      modifiedAt: "2026-06-08T00:00:00.000Z",
      body: [],
    };

    expect(normalizePost(post).data.modifiedDate).toEqual(new Date("2026-06-08T00:00:00.000Z"));
  });

  it("maps glossary definition fields to Dualmark glossary summary fields", () => {
    const term: SanityGlossaryTerm = {
      _id: "term-1",
      _type: "glossaryTerm",
      term: "Answer Engine Optimization",
      slug: { current: "answer-engine-optimization" },
      definition: "Structuring web content so answer engines can cite it accurately.",
      category: "AEO",
      relatedTerms: ["llms-txt"],
      canonicalBlog: "/blog/cms-driven-aeo",
      body: [],
    };

    expect(normalizeGlossaryTerm(term)).toEqual({
      id: "answer-engine-optimization",
      data: {
        term: "Answer Engine Optimization",
        title: "Answer Engine Optimization",
        summary: "Structuring web content so answer engines can cite it accurately.",
        category: "AEO",
        relatedTerms: ["llms-txt"],
        learnMore: [{ title: "Read the related article", href: "/blog/cms-driven-aeo" }],
        canonicalBlog: "/blog/cms-driven-aeo",
      },
    });
  });
});
