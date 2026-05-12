import type { DualmarkSvelteKitConfig } from "@dualmark/sveltekit";
import { POSTS, postToEntry } from "./lib/posts";

const SITE_URL = "https://sveltekit.dualmark.dev";

const config: DualmarkSvelteKitConfig = {
  siteUrl: SITE_URL,
  collections: {
    posts: {
      converter: "blog",
      getEntries: () => POSTS.map(postToEntry),
      slugStrategy: "single",
      listingMetadata: {
        title: "Posts",
        description: "All posts on the Dualmark SvelteKit example.",
      },
    },
  },
  staticPages: [
    {
      pattern: "/",
      render: () => `# Dualmark SvelteKit Example

Reference implementation of Dualmark on SvelteKit.

## Posts

- [Hello from SvelteKit + Dualmark](/posts/hello)
- [How content negotiation works](/posts/negotiation)
`,
    },
  ],
  llmsTxt: {
    enabled: true,
    brandName: "Dualmark SvelteKit Example",
    description: "A reference implementation of Dualmark on SvelteKit.",
    sections: [
      {
        title: "Posts",
        links: POSTS.map((post) => ({
          title: post.title,
          href: `${SITE_URL}/posts/${post.slug}`,
          description: post.description,
        })),
      },
    ],
  },
};

export default config;
