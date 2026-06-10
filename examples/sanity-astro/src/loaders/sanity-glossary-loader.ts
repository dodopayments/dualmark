import type { Loader } from "astro/loaders";
import { getSanityExampleEnv } from "../lib/sanity/env";
import { getGlossaryTerms } from "../lib/sanity/fetch";
import { normalizeGlossaryTerm } from "../lib/sanity/normalize";
import { portableTextToMarkdownBody } from "../lib/sanity/to-markdown";

export function sanityGlossaryLoader(): Loader {
  return {
    name: "sanity-glossary-loader",
    async load({ store, parseData, renderMarkdown, generateDigest }) {
      const env = getSanityExampleEnv();
      const terms = await getGlossaryTerms();
      store.clear();

      for (const term of terms) {
        const normalized = normalizeGlossaryTerm(term);
        const bodyMarkdown = portableTextToMarkdownBody(term.body, env);
        const markdownBody = [term.definition?.trim(), bodyMarkdown].filter(Boolean).join("\n\n");
        const data = await parseData({ id: normalized.id, data: { ...normalized.data } });
        const rendered = await renderMarkdown(markdownBody);

        store.set({
          id: normalized.id,
          data,
          body: markdownBody,
          rendered,
          digest: generateDigest({ data, body: markdownBody }),
        });
      }
    },
  };
}
