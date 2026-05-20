import type { AIRequestInfo, MissInfo, TrailingSlashMode } from "@dualmark/core";

export interface FastlyBackendFetchInit extends RequestInit {
  backend?: string;
}

export type FastlyFetch = (
  request: Request,
  init?: FastlyBackendFetchInit,
) => Promise<Response>;

export interface MinimalFetchEvent {
  request: Request;
  respondWith: (response: Response | Promise<Response>) => void;
}

export interface CreateAEORequestHandlerOptions {
  backend: string;
  markdownBackend?: string;
  fetcher?: FastlyFetch;
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

export type AEORequestHandler = (request: Request) => Promise<Response>;

export type AEOFetchEventHandler = (event: MinimalFetchEvent) => void;

export type { AIRequestInfo, MissInfo, TrailingSlashMode };
