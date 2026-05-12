import { error } from "@sveltejs/kit";
import { POSTS } from "$lib/posts";

export const prerender = true;

export function entries() {
  return POSTS.map((post) => ({ slug: post.slug }));
}

export function load({ params }: { params: { slug: string } }) {
  const post = POSTS.find((item) => item.slug === params.slug);
  if (!post) error(404, "Post not found");
  return { post };
}
