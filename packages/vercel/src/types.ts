import type { AIRequestInfo, MissInfo, TrailingSlashMode } from "@dualmark/core";

export type { AIRequestInfo, MissInfo, TrailingSlashMode };

export interface VercelEdgeContext {
  waitUntil: (promise: Promise<unknown>) => void;
}

export type AssetFetcher = (url: URL, init?: RequestInit) => Promise<Response>;

export type UpstreamHandler = (request: Request) => Promise<Response> | Response;

export interface CreateAEOMiddlewareOptions {
  upstream: UpstreamHandler;
  fetchAsset: AssetFetcher;
  redirects?: {
    internal?: Record<string, string>;
    external?: Record<string, string>;
  };
  skip?: {
    prefixes?: ReadonlyArray<string>;
    extensions?: ReadonlyArray<string>;
  };
  trailingSlash?: TrailingSlashMode;
  headers?: {
    cacheControl?: string;
  };
  // Named `analytics` per issue #8 spec — replaces Cloudflare's binding-based
  // `analytics` + generic `hooks` with a unified hook for Vercel Analytics/OTel.
  analytics?: {
    onAIRequest?: (info: AIRequestInfo) => void | Promise<void>;
    onMiss?: (info: MissInfo) => void | Promise<void>;
  };
  enableLinkHeader?: boolean;
}
