import { Link } from "react-router";
import { POSTS } from "../posts";

export default function Posts() {
  return (
    <main>
      <h1>Posts</h1>
      <ul>
        {POSTS.map((post) => (
          <li key={post.slug}>
            <Link to={`/posts/${post.slug}`}>{post.title}</Link>
            <p>{post.description}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
