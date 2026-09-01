import { Link, useParams } from "react-router";
import { getPost } from "../posts";

export default function Post() {
  const { slug } = useParams();
  const post = slug ? getPost(slug) : null;

  if (!post) {
    return (
      <main>
        <h1>Post not found</h1>
        <Link to="/posts">Back to posts</Link>
      </main>
    );
  }

  return (
    <main>
      <Link to="/posts">Back to posts</Link>
      <article>
        <h1>{post.title}</h1>
        <p>{post.description}</p>
        <time dateTime={post.publishedDate.toISOString()}>
          {post.publishedDate.toISOString().slice(0, 10)}
        </time>
        {post.body.split("\n\n").map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </article>
    </main>
  );
}
