---
"@dualmark/converters": patch
---

Fix the blog converter turning a post's last body line into a heading.

The footer was concatenated directly onto the body with no blank line, so the output ended with `last body line\n---`. CommonMark parses a line of text immediately followed by `---` as a setext H2, which turned the final line of every blog post body into a heading and dropped the intended horizontal rule before the footer links. The body and footer are now separated by a blank line so the `---` is a thematic break.
