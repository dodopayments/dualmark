import type { Loader } from "astro/loaders";
import { getSanityExampleEnv } from "../lib/sanity/env";
import { getPosts } from "../lib/sanity/fetch";
import { normalizePost } from "../lib/sanity/normalize";
import { portableTextToMarkdownBody } from "../lib/sanity/to-markdown";

export function sanityBlogLoader(): Loader {
  return {
    name: "sanity-blog-loader",
    async load({ store, parseData, renderMarkdown, generateDigest }) {
      const env = getSanityExampleEnv();
      const posts = await getPosts();
      store.clear();

      for (const post of posts) {
        const normalized = normalizePost(post);
        const markdownBody = portableTextToMarkdownBody(post.body, env);
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
