import { defineConfig } from "astro/config";
import dualmark from "@dualmark/astro";

const SITE_URL = "https://sanity-astro.dualmark.dev";

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
            title: "Sanity-powered Blog",
            description: "CMS-authored posts rendered as Dualmark markdown twins.",
          },
        },
        glossary: {
          converter: "glossary",
          slugStrategy: "single",
          listingMetadata: {
            title: "Sanity-powered Glossary",
            description: "CMS-authored glossary terms rendered as markdown twins.",
          },
        },
      },
      staticPages: [
        {
          pattern: "/",
          render: () =>
            "# Dualmark Sanity Example\n\nA CMS-driven Astro site where Sanity content generates HTML for humans and markdown twins for AI agents.",
        },
        {
          pattern: "/about",
          render: () =>
            "# About\n\nThis example demonstrates a fixture-backed Sanity integration for Dualmark.",
        },
      ],
      llmsTxt: {
        enabled: true,
        brandName: "Dualmark Sanity Example",
        description: "A Sanity CMS and Astro example for Dualmark markdown twins.",
        sections: [
          {
            title: "Pages",
            links: [
              { title: "Home", href: `${SITE_URL}/` },
              { title: "About", href: `${SITE_URL}/about` },
              { title: "Blog", href: `${SITE_URL}/blog` },
              { title: "Glossary", href: `${SITE_URL}/glossary` },
            ],
          },
        ],
      },
    }),
  ],
});
