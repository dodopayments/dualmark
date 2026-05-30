import type { AIRequestInfo, MissInfo, TrailingSlashMode } from "@dualmark/core";

/**
 * Minimal Deno.ServeHandlerInfo interface. Declared locally so this package
 * builds in a Node/Bun monorepo without requiring Deno types to be installed.
 *
 * Mirrors the shape provided by `Deno.serve` to its handler.
 * See: https://docs.deno.com/api/deno/~/Deno.ServeHandlerInfo
 */
export interface DenoServeHandlerInfo {
  /** Information about the remote peer. */
  remoteAddr: {
    transport: "tcp" | "udp" | "unix" | "unixpacket";
    hostname: string;
    port: number;
  };
  /**
   * A promise that resolves when the request has fully completed.
   * Use this for background tasks that must finish before the runtime
   * suspends the isolate (Deno Deploy's equivalent of ctx.waitUntil).
   */
  completed: Promise<void>;
}

/**
 * The upstream handler the adapter wraps. Mirrors the standard Deno.serve
 * handler signature so users can drop in any existing fetch handler.
 *
 * The adapter delegates to this function for:
 * - All non-AI-bot HTML responses
 * - Static markdown twin retrieval (e.g., serving the `.md` file on disk)
 */
export type DenoUpstreamHandler = (
  request: Request,
  info: DenoServeHandlerInfo,
) => Promise<Response> | Response;

/**
 * The handler returned by createAEOHandler. Drop directly into Deno.serve.
 */
export type AEODenoHandler = (
  request: Request,
  info: DenoServeHandlerInfo,
) => Promise<Response>;

export interface CreateAEOHandlerOptions {
  /**
   * Upstream handler that the adapter wraps. Receives the same (request, info)
   * Deno.serve would pass. Responsible for serving HTML responses AND for
   * serving the underlying `.md` static files (e.g., from a directory).
   */
  upstream: DenoUpstreamHandler;

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
   * Lifecycle hooks. The adapter wires these to `info.completed` so they
   * never block the response but are guaranteed to flush before the
   * isolate suspends (on Deno Deploy).
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
