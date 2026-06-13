import type { AIRequestInfo, MissInfo, TrailingSlashMode } from "@dualmark/core";

export interface CreateAEOFastlyOptions {
  /**
   * The name of the Fastly backend to route standard HTML/asset requests to.
   * This must match the backend name configured in your fastly.toml or Fastly dashboard.
   */
  backend: string;

  /**
   * The name of the Fastly backend to route markdown requests to.
   * Defaults to the same value as `backend` if not provided.
   */
  markdownBackend?: string;

  /**
   * Optional redirect maps for canonical-path resolution.
   * - `internal`: pathname → pathname (within the same origin)
   * - `external`: pathname → absolute URL
   */
  redirects?: {
    internal?: Record<string, string>;
    external?: Record<string, string>;
  };

  /**
   * Paths the adapter should ignore entirely (pass straight to upstream).
   * Defaults to common admin/api/asset patterns.
   */
  skip?: {
    prefixes?: ReadonlyArray<string>;
    extensions?: ReadonlyArray<string>;
  };

  /** Trailing-slash normalization policy. Default: "never". */
  trailingSlash?: TrailingSlashMode;

  headers?: {
    /** Cache-Control header on markdown responses. */
    cacheControl?: string;
  };

  /**
   * Lifecycle hooks for analytics or logging.
   * Fastly's FetchEvent.waitUntil() is used to ensure these complete
   * in the background without blocking the response.
   */
  hooks?: {
    onAIRequest?: (info: AIRequestInfo) => void | Promise<void>;
    onMiss?: (info: MissInfo) => void | Promise<void>;
  };

  /**
   * When true (default), the adapter appends a `Link: <…>; rel="alternate";
   * type="text/markdown"` header to HTML responses so AI crawlers can
   * discover the markdown twin.
   */
  enableLinkHeader?: boolean;
}

export type { AIRequestInfo, MissInfo, TrailingSlashMode };

/**
 * Signature for the raw request handler.
 */
export type AEOFastlyRequestHandler = (
  request: Request,
  waitUntil?: (promise: Promise<any>) => void
) => Promise<Response>;

/**
 * Signature for the FetchEvent handler.
 */
export type AEOFastlyFetchEventHandler = (event: FetchEvent) => Promise<Response>;
