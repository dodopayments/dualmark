# @dualmark/converters

## 0.2.0

### Minor Changes

- ccfb8ec: **BREAKING (pre-1.0)**: Generalize converters for any marketing site (no longer fintech-specific). Per semver §4, breaking changes are allowed in minor bumps before 1.0.

  ### Removed
  - `productConverter` — replaced by `featureConverter`
  - `taxConverter`, `countryConverter`, `currencyConverter`, `paymentMethodConverter` — replaced by the single generic `pseoConverter`
  - `paymentProvider` field on `caseStudyConverter` — use `industry` instead

  ### Added
  - `featureConverter` — feature/product pages with siblings, FAQ, problem/solution sections
  - `pseoConverter` — programmatic SEO pages with configurable facts and related-link groups
  - `changelogConverter` — Keep-a-Changelog-style release notes with grouped changes
  - `pricingConverter` — pricing tables with tier highlights, recommended badge, CTAs
  - `docsConverter` — documentation pages with section grouping
  - `quote` field on `caseStudyConverter` — optional pull-quote with attribution

  ### Migration

  ```diff
  - import { productConverter, taxConverter, countryConverter } from "@dualmark/converters";
  + import { featureConverter, pseoConverter } from "@dualmark/converters";

  - productConverter({ siteUrl, basePath: "/products", platformContext: () => "..." })
  + featureConverter({ siteUrl, basePath: "/features", category: "Platform" })

  - taxConverter({ siteUrl, basePath: "/tax" })
  + pseoConverter({ siteUrl, basePath: "/tax" })
  + // entry data: { title, facts: [{ label, value }], related: [{ title, basePath, slugs }] }
  ```

  The `@dualmark/astro` `converter:` string union changed accordingly:
  `"blog" | "case-study" | "changelog" | "compare" | "docs" | "feature" | "glossary" | "legal" | "pricing" | "pseo" | "tool" | "video"`.

### Patch Changes

- Updated dependencies [5e49dc2]
  - @dualmark/core@0.2.0
