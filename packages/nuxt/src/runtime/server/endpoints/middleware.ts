import { defineEventHandler, getRequestHeader } from 'h3';
import { negotiateFormat, detectAIBot, markdownResponse, listingToMarkdown } from '@dualmark/core';
import type { Converter, CollectionEntry } from '@dualmark/converters';
import type { H3Event } from 'h3';

export interface MakeCollectionMiddlewareOptions<TEntry = CollectionEntry<unknown>> {
  collectionName: string;
  siteUrl: string;
  basePath: string;
  converter: Converter<TEntry>;
  listingTitle: string;
  listingDescription: string;
  getCollection: (event: H3Event, name: string, filter?: any) => Promise<TEntry[]> | TEntry[];
  responseOptions?: {
    cacheControl?: string;
    noindex?: boolean;
  };
}

export function makeCollectionMiddleware<TEntry = CollectionEntry<unknown>>(
  options: MakeCollectionMiddlewareOptions<TEntry>
) {
  return defineEventHandler(async (event) => {
    const path = (event.path ?? '/').split('?')[0];

    // Quickly bail out for paths that don't belong to this collection.
    const isListing = path === options.basePath + '.md';
    const isUnderBase = path.startsWith(options.basePath + '/');
    if (!isListing && !isUnderBase) return;

    const isMd = path.endsWith('.md');
    const accept = getRequestHeader(event, 'accept') ?? '';
    const ua = getRequestHeader(event, 'user-agent') ?? '';
    const botInfo = detectAIBot(ua);
    const format = negotiateFormat(accept);

    if (!isMd && format === null && !botInfo.isBot) {
      return new Response('Not Acceptable', { status: 406 });
    }

    const serveMarkdown = isMd || botInfo.isBot || format === 'markdown';

    if (!serveMarkdown) {
      // Regular HTML request — pass through to Nuxt SSR.
      return;
    }

    // Listing: /blog.md
    if (isListing) {
      const entries = await options.getCollection(event, options.collectionName);
      const items = entries.map((entry: any) => {
        const data = entry.data;
        return {
          title: data.title ?? entry.id,
          href: options.basePath + '/' + entry.id,
          description: data.description,
        };
      });
      const md = listingToMarkdown({
        title: options.listingTitle,
        description: options.listingDescription,
        url: options.siteUrl + options.basePath,
        items,
      });
      return markdownResponse(md, options.responseOptions);
    }

    // Detail: /blog/post-1.md or /blog/post-1 (negotiate)
    const prefix = options.basePath + '/';
    const rawSlug = isMd
      ? path.slice(prefix.length, -3)
      : path.slice(prefix.length);
    
    if (!rawSlug) return new Response('Not Found', { status: 404 });

    const entries = await options.getCollection(event, options.collectionName);
    const entry = entries.find((e: any) => e.id === rawSlug);
    if (!entry) return new Response('Not Found', { status: 404 });

    return markdownResponse(options.converter(entry), options.responseOptions);
  });
}
