#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const specDir = join(here, "..", "..", "..", "spec");
const outDir = join(here, "..", "content", "docs", "spec");

const FILE_MAP = {
  "README.md": { slug: "overview", title: "Overview", description: "AEO Specification v1.0 — proposed convention. Scope, terminology, status, section index." },
  "content-negotiation.md": { slug: "content-negotiation", title: "Content negotiation", description: "RFC 7231 §5.3.2 — how Dualmark picks HTML vs markdown." },
  "headers.md": { slug: "headers", title: "Response headers", description: "Required and recommended response headers for markdown twins." },
  "ai-bot-detection.md": { slug: "ai-bot-detection", title: "AI bot registry", description: "The canonical list of AI crawler User-Agent patterns." },
  "discovery.md": { slug: "discovery", title: "Discovery", description: "How AI clients find a site's markdown twins and llms.txt." },
  "llms-txt-extensions.md": { slug: "llms-txt-extensions", title: "llms.txt extensions", description: "Dualmark's additions to the llms.txt convention." },
  "conformance.md": { slug: "conformance", title: "Conformance", description: "Basic, Standard, and Advanced conformance levels." },
};

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

let synced = 0;
for (const name of readdirSync(specDir)) {
  const meta = FILE_MAP[name];
  if (!meta) continue;

  let body = readFileSync(join(specDir, name), "utf8");

  body = body.replace(/^# .+(?:\r?\n)+/, "");

  body = body.replace(
    /\]\(\.\/([\w-]+)\.md(#[^)]+)?\)/g,
    (_m, slug, hash = "") => `](/docs/spec/${FILE_MAP[`${slug}.md`]?.slug ?? slug}${hash})`,
  );

  body = body.replace(/\.\.\/packages\/([\w-]+)/g, (_m, pkg) => `/docs/packages/${pkg}`);
  body = body.replace(/\.\.\/packages/g, "/docs/packages/core");

  const frontmatter = `---\ntitle: ${meta.title}\ndescription: ${meta.description}\n---\n\n`;
  writeFileSync(join(outDir, `${meta.slug}.mdx`), frontmatter + body, "utf8");
  synced++;
}

console.log(`[sync-spec] synced ${synced} spec files → apps/docs/content/docs/spec/`);
