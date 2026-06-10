export interface SanitySlug {
  current?: string | null;
}

export interface SanityImageAsset {
  _ref: string;
}

export interface SanityImageBlock {
  _key?: string;
  _type: "image";
  alt?: string | null;
  caption?: string | null;
  asset?: SanityImageAsset | null;
}

export interface SanitySpan {
  _key?: string;
  _type: "span";
  text: string;
  marks?: string[];
}

export interface SanityMarkDefinition {
  _key: string;
  _type: string;
  href?: string;
  slug?: string;
  type?: "blog" | "glossary";
}

export interface SanityTextBlock {
  _key?: string;
  _type: "block";
  style?: string;
  listItem?: string;
  level?: number;
  markDefs?: SanityMarkDefinition[];
  children: SanitySpan[];
}

export type PortableTextBlock = SanityTextBlock | SanityImageBlock;

export interface SanityPost {
  _id: string;
  _type: "post";
  title: string;
  slug: SanitySlug;
  description?: string | null;
  author?: string | null;
  publishedAt?: string | null;
  publishedDate?: string | null;
  modifiedAt?: string | null;
  modifiedDate?: string | null;
  category?: string | string[] | null;
  body?: PortableTextBlock[] | null;
}

export interface SanityGlossaryTerm {
  _id: string;
  _type: "glossaryTerm";
  term: string;
  title?: string | null;
  slug: SanitySlug;
  definition?: string | null;
  summary?: string | null;
  category?: string | null;
  relatedTerms?: string[] | null;
  canonicalBlog?: string | null;
  body?: PortableTextBlock[] | null;
}

export interface SanityFixtureExport {
  posts: SanityPost[];
  glossaryTerms: SanityGlossaryTerm[];
}

export interface NormalizedPostData {
  title: string;
  description?: string;
  author?: string;
  publishedDate: Date;
  modifiedDate?: Date;
  category?: string | string[];
}

export interface NormalizedGlossaryData {
  term: string;
  title: string;
  summary?: string;
  category?: string;
  relatedTerms?: string[];
  learnMore?: Array<{ title: string; href: string }>;
  canonicalBlog?: string;
}

export interface NormalizedEntry<TData> {
  id: string;
  data: TData;
}

export interface SanityProjectDetails {
  projectId?: string;
  dataset?: string;
}
