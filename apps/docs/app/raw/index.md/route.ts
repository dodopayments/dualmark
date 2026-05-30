import { markdownResponse } from "@dualmark/core";

export const dynamic = "force-static";

const BODY = `# Dualmark

> Your blog ranks #1 on Google. ChatGPT cites your competitor. That's an infrastructure problem.

Dualmark is open-source AEO infrastructure for marketing sites. AI search engines (ChatGPT, Claude, Perplexity, Gemini, Google AI Overviews) read the web differently from humans — they want clean markdown without nav chrome, JavaScript, or cookie banners. Most marketing sites give them HTML soup and wonder why they get ignored.

**Dualmark gives every page a markdown twin.** Same URL. Two formats. Picked by HTTP content negotiation. Drop into your Astro/Next.js/Cloudflare stack in 30 seconds. Score it with \`dualmark verify\`.

## Quickstart

\`\`\`bash
bun add @dualmark/astro
\`\`\`

See https://dualmark.dev/docs/quickstart for the full integration guide.

## What's in the box

- \`@dualmark/core\` — framework-agnostic primitives (content negotiation, AI bot detection, markdown response builder)
- \`@dualmark/astro\` — Astro 5 integration
- \`@dualmark/cloudflare\` — Workers edge adapter
- \`@dualmark/cli\` — \`dualmark verify\` conformance test runner
- \`@dualmark/converters\` — production-tested page-type converters

## Links

- Documentation: https://dualmark.dev/docs
- Playground (score any URL): https://dualmark.dev/play
- AEO Spec v1.0: https://dualmark.dev/docs/spec/overview
- GitHub: https://github.com/dodopayments/dualmark
- llms.txt: https://dualmark.dev/llms.txt

## License

Apache 2.0
`;

export function GET(): Response {
  return markdownResponse(BODY, {
    cacheControl: "public, max-age=3600",
    noindex: true,
  });
}
