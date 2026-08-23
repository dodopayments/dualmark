import { joinLines, fmtDate, cleanBody, normalizeUnicode } from "@dualmark/core";
import type { BaseConverterConfig, CollectionEntry, Converter } from "./types.js";

export interface BlogConverterConfig extends BaseConverterConfig {
  basePath?: string;
  categoryBasePath?: string;
  showAllArticlesLink?: boolean;
}

export interface BlogEntryData {
  title: string;
  description?: string;
  author?: string;
  publishedDate: Date;
  modifiedDate?: Date;
  category?: string | string[];
}

export function blogConverter(
  config: BlogConverterConfig,
): Converter<CollectionEntry<BlogEntryData>> {
  const basePath = config.basePath ?? "/blog";
  const categoryBasePath = config.categoryBasePath ?? `${basePath}/category`;
  const showAllArticles = config.showAllArticlesLink !== false;

  return (entry) => {
    const d = entry.data;
    const cats = d.category ? (Array.isArray(d.category) ? d.category : [d.category]) : [];

    const base = joinLines(
      `# ${d.title}`,
      d.description && `\n> ${d.description}`,
      "",
      d.author && `- **Author**: ${d.author}`,
      `- **Published**: ${fmtDate(d.publishedDate)}`,
      d.modifiedDate && `- **Modified**: ${fmtDate(d.modifiedDate)}`,
      cats.length > 0 && `- **Category**: ${cats.join(", ")}`,
      `- **URL**: ${config.siteUrl}${basePath}/${entry.id}`,
      "\n---",
      entry.body && `\n${cleanBody(entry.body)}`,
    );

    const footer: string[] = ["\n---"];
    if (cats.length > 0 && cats[0]) {
      const catSlug = cats[0]
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      footer.push(`- [More ${cats[0]} articles](${config.siteUrl}${categoryBasePath}/${catSlug})`);
    }
    if (showAllArticles) {
      footer.push(`- [All articles](${config.siteUrl}${basePath})`);
    }
    if (config.brandFooter) footer.push("", config.brandFooter);
    // Separate the body from the footer with a blank line. `base` ends with the
    // body's last line (no trailing newline) and `footer` starts with "---";
    // without the blank line CommonMark parses "lastline\n---" as a setext H2,
    // turning the final body line into a heading and swallowing the rule.
    return normalizeUnicode(base + "\n" + footer.join("\n"));
  };
}
