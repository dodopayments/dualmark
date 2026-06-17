import { portableTextToMarkdown } from "@portabletext/markdown";
import { createImageUrlBuilder } from "@sanity/image-url";
import type { PortableTextBlock, SanityImageBlock, SanityProjectDetails } from "./types";

type MarkdownOptions = SanityProjectDetails;

function imageToMarkdown(value: SanityImageBlock, details: SanityProjectDetails): string {
  if (!value.asset || !details.projectId || !details.dataset) return "";
  const builder = createImageUrlBuilder({ projectId: details.projectId, dataset: details.dataset });
  const url = builder.image(value.asset).url();
  const alt = value.alt ?? "";
  const caption = value.caption ? `\n\n*${value.caption}*` : "";
  return `![${alt}](${url})${caption}`;
}

export function portableTextToMarkdownBody(
  body: PortableTextBlock[] | null | undefined,
  options: MarkdownOptions = {},
): string {
  if (!body || body.length === 0) return "";

  return portableTextToMarkdown(body, {
    types: {
      image: ({ value }) => imageToMarkdown(value as SanityImageBlock, options),
    },
    marks: {
      internalLink: ({ value, children }) => {
        const type = value?.type === "glossary" ? "glossary" : "blog";
        const slug = typeof value?.slug === "string" ? value.slug : undefined;
        const href = slug ? `/${type}/${slug}` : "/";
        return `[${children}](${href})`;
      },
    },
  }).trim();
}
