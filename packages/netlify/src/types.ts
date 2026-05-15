import type { AIRequestInfo, MissInfo, TrailingSlashMode } from "@dualmark/core";

export type { AIRequestInfo, MissInfo, TrailingSlashMode };

export interface AssetsFetcher {
  fetch: (url: URL | string, init?: RequestInit) => Promise<Response>;
}

export interface NetlifyContext {
  next: (req?: Request) => Promise<Response>;
  waitUntil: (promise: Promise<unknown>) => void;
  geo?: {
    country?: {
      code?: string;
    };
    city?: string;
  };
  ip?: string;
}

/** Options accepted by {@link createAEOWorker}. */
export interface CreateAEOWorkerOptions {
  assets?: AssetsFetcher;
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
}
