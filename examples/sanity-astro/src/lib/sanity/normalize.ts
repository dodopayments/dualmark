import type {
  NormalizedEntry,
  NormalizedGlossaryData,
  NormalizedPostData,
  SanityGlossaryTerm,
  SanityPost,
} from "./types";

function definedString(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function coerceDate(value: string | null | undefined, fallback: string): Date {
  return new Date(definedString(value) ?? fallback);
}

function requireSlug(slug: { current?: string | null }, label: string): string {
  const current = definedString(slug.current);
  if (!current) throw new Error(`Sanity ${label} is missing slug.current`);
  return current;
}

export function normalizePost(post: SanityPost): NormalizedEntry<NormalizedPostData> {
  return {
    id: requireSlug(post.slug, post.title),
    data: {
      title: post.title,
      description: definedString(post.description),
      author: definedString(post.author),
      publishedDate: coerceDate(post.publishedDate ?? post.publishedAt, "1970-01-01T00:00:00.000Z"),
      modifiedDate: definedString(post.modifiedDate ?? post.modifiedAt)
        ? new Date(post.modifiedDate ?? post.modifiedAt ?? "")
        : undefined,
      category: post.category ?? undefined,
    },
  };
}

export function normalizeGlossaryTerm(
  term: SanityGlossaryTerm,
): NormalizedEntry<NormalizedGlossaryData> {
  const canonicalBlog = definedString(term.canonicalBlog);
  const learnMore = canonicalBlog
    ? [{ title: "Read the related article", href: canonicalBlog }]
    : undefined;
  const title = definedString(term.title) ?? term.term;

  return {
    id: requireSlug(term.slug, term.term),
    data: {
      term: term.term,
      title,
      summary: definedString(term.summary) ?? definedString(term.definition),
      category: definedString(term.category),
      relatedTerms: term.relatedTerms ?? undefined,
      learnMore,
      canonicalBlog,
    },
  };
}
