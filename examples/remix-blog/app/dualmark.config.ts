import type { DualmarkRemixConfig } from "@dualmark/remix";
import { POSTS, postToEntry } from "./posts";

const SITE_URL = "https://react-router.dualmark.dev";

function titleFromData(data: unknown): string {
  if (typeof data === "object" && data !== null && "title" in data) {
    const title = data.title;
    if (typeof title === "string") return title;
  }
  return "Untitled";
}

function descriptionFromData(data: unknown): string | undefined {
  if (typeof data === "object" && data !== null && "description" in data) {
    const description = data.description;
    if (typeof description === "string") return description;
  }
  return undefined;
}

function publishedDateFromData(data: unknown): string {
  if (typeof data === "object" && data !== null && "publishedDate" in data) {
    const publishedDate = data.publishedDate;
    if (publishedDate instanceof Date) return publishedDate.toISOString().slice(0, 10);
    if (typeof publishedDate === "string") return publishedDate.slice(0, 10);
  }
  return "2026-07-05";
}

function renderPostMarkdown(entry: { readonly id: string; readonly data: unknown; readonly body?: string }): string {
  const title = titleFromData(entry.data);
  const description = descriptionFromData(entry.data);
  return [
    `# ${title}`,
    description ? `\n> ${description}` : "",
    "",
    `- **Published**: ${publishedDateFromData(entry.data)}`,
    `- **URL**: ${SITE_URL}/posts/${entry.id}`,
    "\n---",
    entry.body ? `\n${entry.body}` : "",
    "\n---",
    `- [All posts](${SITE_URL}/posts)`,
  ].filter(Boolean).join("\n");
}

const config: DualmarkRemixConfig = {
  siteUrl: SITE_URL,
  collections: {
    posts: {
      converter: renderPostMarkdown,
      route: "posts",
      slugStrategy: "single",
      getEntries: () => POSTS.map(postToEntry),
      listingMetadata: {
        title: "Posts",
        description: "All posts on the Dualmark React Router example.",
      },
    },
  },
  staticPages: [
    {
      pattern: "/",
      render: () => `# Dualmark React Router Example

Reference implementation of Dualmark on React Router v7 Framework Mode.

## Posts

- [Hello from React Router + Dualmark](/posts/hello)
- [How content negotiation works](/posts/negotiation)
`,
    },
  ],
  llmsTxt: {
    enabled: true,
    brandName: "Dualmark React Router Example",
    description: "A reference implementation of Dualmark on React Router v7.",
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
