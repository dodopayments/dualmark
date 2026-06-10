import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { sanityBlogLoader } from "./loaders/sanity-blog-loader";
import { sanityGlossaryLoader } from "./loaders/sanity-glossary-loader";

const blog = defineCollection({
  loader: sanityBlogLoader(),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    author: z.string().optional(),
    publishedDate: z.coerce.date(),
    modifiedDate: z.coerce.date().optional(),
    category: z.union([z.string(), z.array(z.string())]).optional(),
  }),
});

const glossary = defineCollection({
  loader: sanityGlossaryLoader(),
  schema: z.object({
    term: z.string(),
    title: z.string(),
    summary: z.string().optional(),
    category: z.string().optional(),
    relatedTerms: z.array(z.string()).optional(),
    learnMore: z.array(z.object({ title: z.string(), href: z.string() })).optional(),
    canonicalBlog: z.string().optional(),
  }),
});

export const collections = { blog, glossary };
