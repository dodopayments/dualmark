import type { AIRequestInfo, MissInfo, TrailingSlashMode, TokenEstimator } from "@dualmark/core";

export type { AIRequestInfo, MissInfo, TrailingSlashMode, TokenEstimator };

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
  hooks?: {
    onAIRequest?: (info: AIRequestInfo) => void | Promise<void>;
    onMiss?: (info: MissInfo) => void | Promise<void>;
  };
  enableLinkHeader?: boolean;
  /** Custom token estimator. Overrides the default whitespace-word counter. */
  tokenizer?: TokenEstimator;
}
