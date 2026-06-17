import {
  markdownResponse,
  listingToMarkdown,
  type MarkdownResponseOptions,
  type ListingItem,
} from "@dualmark/core";
import type { CollectionEntry } from "@dualmark/converters";

import { defineEventHandler, type H3Event } from "h3";

export interface ListingEndpointArgs<TEntry extends CollectionEntry<unknown>> {
  collectionName: string;
  siteUrl: string;
  basePath: string;
  title: string;
  description: string;
  getCollection: (
    event: H3Event,
    name: string,
    filter?: (entry: TEntry) => boolean,
  ) => Promise<TEntry[]>;
  filter?: (entry: TEntry) => boolean;
  sort?: (a: TEntry, b: TEntry) => number;
  itemMapper?: (entry: TEntry) => ListingItem;
  responseOptions?: MarkdownResponseOptions;
}

export function makeListingEndpoint<TEntry extends CollectionEntry<unknown>>(
  args: ListingEndpointArgs<TEntry>
) {
  return defineEventHandler(async (event: H3Event) => {
    let entries = await args.getCollection(event, args.collectionName, args.filter);
    if (args.sort) entries = [...entries].sort(args.sort);
    const items: ListingItem[] = entries.map(
      args.itemMapper ??
        ((entry) => {
          const data = entry.data as { title?: string; description?: string };
          return {
            title: data.title ?? entry.id,
            href: `${args.basePath}/${entry.id}`,
            description: data.description,
          };
        }),
    );
    const md = listingToMarkdown({
      title: args.title,
      description: args.description,
      url: `${args.siteUrl}${args.basePath}`,
      items,
    });
    return markdownResponse(md, args.responseOptions);
  })
}
