import type { CollectionEntry } from "@dualmark/converters";

export interface Post {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly publishedDate: Date;
  readonly body: string;
}

export const POSTS: readonly Post[] = [
  {
    slug: "hello",
    title: "Hello from React Router + Dualmark",
    description: "A minimal React Router Framework Mode page with a markdown twin.",
    publishedDate: new Date("2026-07-05T00:00:00.000Z"),
    body: `This example uses \`@dualmark/remix\` to serve clean markdown to AI agents while humans see the React Router page.

The same URL supports both representations through content negotiation.`,
  },
  {
    slug: "negotiation",
    title: "How content negotiation works",
    description: "How Dualmark chooses HTML or markdown from request headers.",
    publishedDate: new Date("2026-07-05T00:00:00.000Z"),
    body: `Dualmark checks the \`Accept\` header and known AI bot user agents before React Router renders HTML.

Browsers receive HTML with a \`Link rel=alternate\` header pointing to the markdown twin.`,
  },
];

export function postToEntry(post: Post): CollectionEntry<Post> {
  return {
    id: post.slug,
    data: post,
    body: post.body,
  };
}

export function getPost(slug: string): Post | null {
  return POSTS.find((post) => post.slug === slug) ?? null;
}
