import { createLlmsTxtHandler } from "@dualmark/nextjs";

const SITE_URL = "https://nextjs.dualmark.dev";

const handler = createLlmsTxtHandler({
  brandName: "Dualmark Next.js Example",
  description: "Reference implementation of Dualmark on Next.js 16 App Router.",
  sections: [
    {
      title: "Pages",
      links: [
        { title: "Home", href: `${SITE_URL}/` },
        { title: "Posts", href: `${SITE_URL}/posts` },
      ],
    },
  ],
});

export const dynamic = "force-static";
export const GET = handler.GET;
