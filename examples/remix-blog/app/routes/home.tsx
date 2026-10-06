import { Link } from "react-router";
import { POSTS } from "../posts";

export default function Home() {
  return (
    <main>
      <h1>Dualmark React Router Example</h1>
      <p>React Router v7 Framework Mode with markdown twins for AI agents.</p>
      <ul>
        {POSTS.map((post) => (
          <li key={post.slug}>
            <Link to={`/posts/${post.slug}`}>{post.title}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
