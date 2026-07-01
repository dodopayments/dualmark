/**
 * URL path utilities for the AEO markdown twin convention.
 *
 * Every HTML page at `/foo` has a markdown twin at `/foo.md`.
 * Root `/` maps to `/index.md`.
 *
 * Both helpers are idempotent: calling them on an already-`.md`
 * path returns it unchanged.
 */

/**
 * Convert a URL pathname to its markdown-twin pathname.
 *
 *   "/"           → "/index.md"
 *   ""            → "/index.md"
 *   "/blog/"      → "/blog.md"
 *   "/blog/post"  → "/blog/post.md"
 *   "/blog/x.md"  → "/blog/x.md"   (idempotent)
 */
export function toMarkdownPath(pathname: string): string {
  // Strip trailing slashes before the `.md` check, otherwise a markdown path
  // with a trailing slash (e.g. "/blog/post.md/") defeats the idempotency
  // guard and gets a doubled extension ("/blog/post.md.md").
  const trimmed = pathname.replace(/\/+$/, "");
  if (trimmed === "") return "/index.md";
  if (trimmed.endsWith(".md")) return trimmed;
  return trimmed + ".md";
}

/**
 * Convert a full URL (string or URL) to its markdown-twin URL.
 * Preserves origin, search, and hash.
 *
 *   "https://x.com/blog?q=1" → "https://x.com/blog.md?q=1"
 *   "https://x.com/"         → "https://x.com/index.md"
 *   "https://x.com/blog.md"  → "https://x.com/blog.md"   (idempotent)
 */
export function toMarkdownUrl(input: string | URL): string {
  const u = typeof input === "string" ? new URL(input) : new URL(input.toString());
  u.pathname = toMarkdownPath(u.pathname);
  return u.toString();
}
