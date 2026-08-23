export function normalizeUnicode(text: string): string {
  return text
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, "")
    .replace(/\uFE0F/g, "")
    .replace(/\u20E3/g, "")
    .replace(/\u00AD/g, "")
    .replace(/[\u00A0\u200A\u202F]/g, " ")
    .replace(/[\u2010\u2011]/g, "-")
    .replace(/[\u2018\u2019\u201A\u02BC\u02BB]/g, "'")
    .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "--")
    .replace(/\u2026/g, "...")
    .replace(/[\u2022\u00B7]/g, "-")
    .replace(/\u2192/g, "->")
    .replace(/\u2190/g, "<-")
    .replace(/\u00D7/g, "x")
    .replace(/\u00F7/g, "/")
    .replace(/\u2248/g, "~=")
    .replace(/\u2265/g, ">=")
    .replace(/\u00A2/g, "c")
    .replace(/\u20B9/g, "INR ")
    .replace(/\u20AC/g, "EUR ")
    .replace(/\u00A3/g, "GBP ")
    .replace(/\u00A5/g, "JPY ")
    .replace(/\u20A9/g, "KRW ")
    .replace(/\u20BD/g, "RUB ")
    .replace(/\u20BA/g, "TRY ")
    .replace(/\u20A8/g, "Rs.")
    .replace(/\u058F/g, "AMD ")
    .replace(/\u20BC/g, "AZN ")
    .replace(/\u09F3/g, "BDT ")
    .replace(/\u20A1/g, "CRC ")
    .replace(/\u20BE/g, "GEL ")
    .replace(/\u20AA/g, "ILS ")
    .replace(/\u20B8/g, "KZT ")
    .replace(/\u20A6/g, "NGN ")
    .replace(/\u20B1/g, "PHP ")
    .replace(/\u0E3F/g, "THB ")
    .replace(/[\u{1D5D4}-\u{1D5ED}]/gu, (ch) =>
      String.fromCharCode((ch.codePointAt(0) ?? 0) - 0x1d5d4 + 65),
    )
    .replace(/[\u{1D5EE}-\u{1D607}]/gu, (ch) =>
      String.fromCharCode((ch.codePointAt(0) ?? 0) - 0x1d5ee + 97),
    )
    .replace(/[\u{1D7EC}-\u{1D7F5}]/gu, (ch) =>
      String.fromCharCode((ch.codePointAt(0) ?? 0) - 0x1d7ec + 48),
    );
}

export interface CleanBodyOptions {
  stripImages?: boolean;
  htmlTagReplacements?: Record<string, string>;
  collapseBlankLines?: boolean;
}

const DEFAULT_TAG_REPLACEMENTS: Record<string, string> = {
  Highlighted: "**",
};

export function stripImages(md: string): string {
  return md.replace(/!\[([^\]]*)\]\([^)]+\)/g, (_match, alt: string) => (alt ? alt : ""));
}

export function cleanBody(body: string, opts: CleanBodyOptions = {}): string {
  const stripImg = opts.stripImages !== false;
  const collapse = opts.collapseBlankLines !== false;
  const replacements = opts.htmlTagReplacements ?? DEFAULT_TAG_REPLACEMENTS;

  let out = stripImg ? stripImages(body) : body;

  for (const [tag, marker] of Object.entries(replacements)) {
    // `s` (dotAll) so a tag whose content spans multiple lines is still
    // replaced; without it a multi-line `<Tag>…</Tag>` leaks its raw markup
    // into the cleaned markdown. `.*?` stays lazy, so it still stops at the
    // first closing tag.
    const re = new RegExp(`<${tag}>(.*?)<\\/${tag}>`, "gs");
    out = out.replace(re, `${marker}$1${marker}`);
  }

  out = out.replace(/<br\s*\/?>/g, "\n");

  if (collapse) {
    out = out.replace(/\n{3,}/g, "\n\n");
  }

  return normalizeUnicode(out.trim());
}

export function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => (w[0] ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function fmtDate(d: Date): string {
  const iso = d.toISOString();
  return iso.split("T")[0] ?? iso;
}

export function joinLines(...parts: Array<string | false | null | undefined>): string {
  return normalizeUnicode(parts.filter((x): x is string => Boolean(x)).join("\n"));
}
