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
    title: "Hello from Vercel Edge + Dualmark",
    description: "First post demonstrating @dualmark/vercel edge middleware.",
    author: "Sisyphus",
    publishedDate: "2026-05-24",
    category: "announcements",
    body: `This is the **first post** demonstrating the \`@dualmark/vercel\` edge adapter.

Every page on this site has a markdown twin. Append \`.md\` to any URL or send \`Accept: text/markdown\`.

## How it works

The Vercel Edge Middleware intercepts every request, checks the User-Agent and Accept headers, and serves markdown to AI bots — all at the edge, with zero cold-start overhead.`,
  },
  {
    slug: "negotiation",
    title: "Edge content negotiation",
    description: "How the Vercel edge adapter handles Accept negotiation.",
    author: "Sisyphus",
    publishedDate: "2026-05-24",
    category: "explainers",
    body: `When a request arrives at the Vercel Edge Middleware:

- Known AI bot UA → respond with markdown
- \`Accept: text/markdown\` → respond with markdown
- Otherwise → respond with HTML, plus a \`Link: <…>; rel="alternate"\` header

This way the **same URL** serves the right content to the right consumer — no duplicate URLs, no cloaking.`,
  },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}
