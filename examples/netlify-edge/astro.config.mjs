import { defineConfig } from "astro/config";
import dualmark from "@dualmark/astro";

const SITE_URL = "https://netlify-edge.dualmark.dev";

export default defineConfig({
  site: SITE_URL,
  trailingSlash: "never",
  build: { format: "file" },
  integrations: [
    dualmark({
      siteUrl: SITE_URL,
      collections: {
        blog: {
          converter: "blog",
          slugStrategy: "single",
          listingMetadata: {
            title: "Dualmark Blog",
            description: "Posts on the Netlify Edge example.",
          },
        },
      },
      staticPages: [
        {
          pattern: "/",
          render: () =>
            "# Dualmark on Netlify Edge\n\nA full-stack example: static Astro output + Netlify Edge Functions = AI bots get markdown at the edge, humans get HTML.",
        },
        {
          pattern: "/about",
          render: () =>
            "# About\n\nThis example deploys to Netlify using `@dualmark/netlify` edge adapter.",
        },
      ],
      llmsTxt: {
        enabled: true,
        brandName: "Dualmark Netlify Edge Example",
        description: "Full-stack Dualmark example deployed to Netlify Edge Functions.",
        sections: [
          {
            title: "Pages",
            links: [
              { title: "Home", href: `${SITE_URL}/` },
              { title: "About", href: `${SITE_URL}/about` },
              { title: "Blog", href: `${SITE_URL}/blog` },
            ],
          },
        ],
      },
    }),
  ],
});
