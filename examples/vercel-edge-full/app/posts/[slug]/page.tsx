import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, POSTS } from "@/lib/posts";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  return (
    <main>
      <article>
        <h1>{post.title}</h1>
        <p>
          By <strong>{post.author}</strong> — {post.publishedDate}
        </p>
        {post.body.split("\n\n").map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </article>
      <p>
        <Link href="/posts">← All posts</Link>
      </p>
    </main>
  );
}
