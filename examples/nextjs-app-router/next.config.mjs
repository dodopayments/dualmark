import { withDualmark } from "@dualmark/nextjs";

const SITE_URL = "https://nextjs.dualmark.dev";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: false,
};

export default withDualmark(nextConfig, {
  siteUrl: SITE_URL,
});
