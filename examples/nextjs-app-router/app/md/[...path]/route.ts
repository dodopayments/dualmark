import { createDualmarkRouteHandler } from "@dualmark/nextjs";
import { POSTS, type Post } from "@/lib/posts";

const SITE_URL = "https://nextjs.dualmark.dev";

function postToEntry(p: Post) {
  return {
    id: p.slug,
    data: {
      title: p.title,
      description: p.description,
      author: p.author,
      publishedDate: new Date(p.publishedDate),
      category: p.category,
    },
    body: p.body,
  };
}

const handler = createDualmarkRouteHandler({
  siteUrl: SITE_URL,
  collections: {
    posts: {
      converter: "blog",
      getEntries: () => POSTS.map(postToEntry),
      listingMetadata: {
        title: "Posts",
        description: "All posts on the Dualmark Next.js example.",
      },
    },
  },
  staticPages: [
    {
      pattern: "/",
      render: () => `# Dualmark Next.js Example

> Reference implementation of Dualmark on Next.js 16 App Router.

A minimal site demonstrating the \`@dualmark/nextjs\` adapter — the proxy handles negotiation, the route handler factory serves markdown twins.

## Posts

- [Hello from Next.js + Dualmark](/posts/hello)
- [How content negotiation works](/posts/negotiation)
`,
    },
  ],
});

export const dynamic = "force-static";
export const GET = handler.GET;
export const generateStaticParams = handler.generateStaticParams;
