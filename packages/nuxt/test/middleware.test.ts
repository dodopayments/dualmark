import { describe, it, expect } from 'vitest';
import { makeCollectionMiddleware } from '../src/runtime/server/endpoints/middleware';
import type { H3Event } from 'h3';

describe('makeCollectionMiddleware content negotiation', () => {
  const mockOptions = {
    collectionName: 'blog',
    siteUrl: 'https://example.com',
    basePath: '/blog',
    converter: (entry: any) => `# ${entry.data.title ?? entry.id}`,
    listingTitle: 'Blog',
    listingDescription: 'All posts.',
    getCollection: async () => [
      { id: 'post-1', data: { title: 'Post 1' } },
      { id: 'post-2', data: { title: 'Post 2' } },
    ],
  };

  const handler = makeCollectionMiddleware(mockOptions);

  function createFakeEvent(path: string, headers: Record<string, string> = {}) {
    return {
      path,
      req: {
        headers: new Headers(headers),
      },
      node: {
        req: {
          headers,
        },
      },
      headers: new Headers(headers),
    } as unknown as H3Event;
  }

  it('bails out quickly for unrelated paths', async () => {
    const event = createFakeEvent('/about');
    const res = await handler(event);
    expect(res).toBeUndefined(); // Passes through
  });

  it('passes through regular HTML requests (no bot, no markdown accept)', async () => {
    const event = createFakeEvent('/blog/post-1', {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9',
    });
    const res = await handler(event);
    expect(res).toBeUndefined();
  });

  it('returns 406 Response for explicitly incompatible Accept headers (not html/md)', async () => {
    const event = createFakeEvent('/blog/post-1', {
      accept: 'application/json',
    });
    const res = await handler(event) as Response;
    expect(res).toBeInstanceOf(Response);
    expect(res.status).toBe(406);
  });

  it('serves markdown if .md extension is used', async () => {
    const event = createFakeEvent('/blog/post-1.md');
    const res = await handler(event) as Response;
    expect(await res.text()).toContain('# Post 1');
  });

  it('serves markdown if Accept prefers markdown', async () => {
    const event = createFakeEvent('/blog/post-1', {
      accept: 'text/markdown,text/html;q=0.9',
    });
    const res = await handler(event) as Response;
    expect(await res.text()).toContain('# Post 1');
  });

  it('serves markdown if User-Agent is a known bot', async () => {
    const event = createFakeEvent('/blog/post-1', {
      'user-agent': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.0; +https://openai.com/gptbot',
    });
    const res = await handler(event) as Response;
    expect(await res.text()).toContain('# Post 1');
  });

  it('returns 404 Response for non-existent markdown slugs', async () => {
    const event = createFakeEvent('/blog/non-existent.md');
    const res = await handler(event) as Response;
    expect(res).toBeInstanceOf(Response);
    expect(res.status).toBe(404);
  });

  it('serves listing markdown for /blog.md', async () => {
    const event = createFakeEvent('/blog.md');
    const res = await handler(event) as Response;
    const body = await res.text();
    expect(body).toContain('# Blog');
    expect(body).toContain('[Post 1](/blog/post-1)');
  });
});
