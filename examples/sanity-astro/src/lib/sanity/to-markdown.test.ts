import { describe, expect, it } from "vitest";
import { portableTextToMarkdownBody } from "./to-markdown";
import type { PortableTextBlock } from "./types";

describe("Portable Text markdown conversion", () => {
  it("renders block text and external links as markdown", () => {
    const body: PortableTextBlock[] = [
      {
        _key: "a",
        _type: "block",
        style: "normal",
        markDefs: [{ _key: "link-1", _type: "link", href: "https://dualmark.dev" }],
        children: [
          { _key: "span-1", _type: "span", text: "Read ", marks: [] },
          { _key: "span-2", _type: "span", text: "Dualmark", marks: ["link-1"] },
        ],
      },
    ];

    expect(portableTextToMarkdownBody(body).trim()).toBe("Read [Dualmark](https://dualmark.dev)");
  });

  it("renders Sanity image blocks with CDN URLs when project details are present", () => {
    const body: PortableTextBlock[] = [
      {
        _key: "image-1",
        _type: "image",
        alt: "Dualmark architecture",
        caption: "CMS content becomes HTML and markdown.",
        asset: { _ref: "image-abc123-1200x630-png" },
      },
    ];

    const markdown = portableTextToMarkdownBody(body, {
      projectId: "demoProject",
      dataset: "production",
    });

    expect(markdown).toContain(
      "![Dualmark architecture](https://cdn.sanity.io/images/demoProject/production/abc123-1200x630.png)",
    );
    expect(markdown).toContain("*CMS content becomes HTML and markdown.*");
  });
});
