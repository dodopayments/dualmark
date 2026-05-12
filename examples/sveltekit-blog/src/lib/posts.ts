import type { CollectionEntry } from "@dualmark/converters";

export interface Post {
  slug: string;
  title: string;
  description: string;
  author: string;
  publishedDate: string;
  category: string;
  body: string;
}

export const POSTS: Post[] = [
  {
    slug: "hello",
    title: "Hello from SvelteKit + Dualmark",
    description: "A reference SvelteKit page with a first-class markdown twin.",
    author: "Dodo Payments",
    publishedDate: "2026-05-06T00:00:00.000Z",
    category: "AEO",
    body: `SvelteKit serves the HTML experience for humans, while Dualmark exposes a clean markdown twin for answer engines.

This example uses a SvelteKit handle hook for content negotiation and generated +server.ts routes for public .md endpoints.`,
  },
  {
    slug: "negotiation",
    title: "How content negotiation works",
    description: "Bots and markdown Accept headers receive the markdown representation.",
    author: "Dodo Payments",
    publishedDate: "2026-05-07T00:00:00.000Z",
    category: "Infrastructure",
    body: `Dualmark checks AI bot user agents and the Accept header before SvelteKit resolves the HTML page.

Browser requests still receive HTML, plus a Link rel=alternate header pointing at the markdown twin.`,
  },
];

export function postToEntry(post: Post): CollectionEntry<{
  title: string;
  description: string;
  author: string;
  publishedDate: Date;
  category: string;
}> {
  return {
    id: post.slug,
    data: {
      title: post.title,
      description: post.description,
      author: post.author,
      publishedDate: new Date(post.publishedDate),
      category: post.category,
    },
    body: post.body,
  };
}
