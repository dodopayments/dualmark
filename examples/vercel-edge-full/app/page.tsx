import Link from "next/link";
import { POSTS } from "@/lib/posts";

export default function HomePage() {
  return (
    <main>
      <h1>Dualmark Vercel Edge Example</h1>
      <p>
        Every page has a markdown twin. Append <code>.md</code> to any URL.
      </p>
      <h2>Posts</h2>
      <ul>
        {POSTS.map((p) => (
          <li key={p.slug}>
            <Link href={`/posts/${p.slug}`}>{p.title}</Link> — {p.description}
          </li>
        ))}
      </ul>
    </main>
  );
}
