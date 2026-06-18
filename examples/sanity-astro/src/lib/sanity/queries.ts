export const postsQuery = `*[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
  _id,
  _type,
  title,
  slug,
  description,
  author,
  publishedAt,
  modifiedAt,
  category,
  body[]{
    ...,
    markDefs[]{
      ...,
      _type == "internalLink" => {
        "type": select(reference->_type == "glossaryTerm" => "glossary", "blog"),
        "slug": reference->slug.current
      }
    }
  }
}`;

export const glossaryTermsQuery = `*[_type == "glossaryTerm" && defined(slug.current)] | order(term asc) {
  _id,
  _type,
  term,
  title,
  slug,
  definition,
  summary,
  category,
  relatedTerms,
  canonicalBlog,
  body[]{
    ...,
    markDefs[]{
      ...,
      _type == "internalLink" => {
        "type": select(reference->_type == "glossaryTerm" => "glossary", "blog"),
        "slug": reference->slug.current
      }
    }
  }
}`;
