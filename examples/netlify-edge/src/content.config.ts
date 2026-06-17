import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    author: z.string().optional(),
    publishedDate: z.coerce.date(),
    modifiedDate: z.coerce.date().optional(),
    category: z.union([z.string(), z.array(z.string())]).optional(),
  }),
});

export const collections = { blog };
