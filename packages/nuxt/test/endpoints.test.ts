import { describe, it, expect } from 'vitest';
import { makeStaticEndpoint } from '../src/runtime/server/endpoints/static';
import { makeListingEndpoint } from '../src/runtime/server/endpoints/listing';
import { makeParameterizedEndpoint } from '../src/runtime/server/endpoints/parameterized';
import { makeLlmsTxtEndpoint } from '../src/runtime/server/endpoints/llms-txt';
import type { H3Event } from 'h3';

function createFakeEvent(path: string = '/') {
  return {
    path,
    context: { params: {} },
    node: { req: { headers: {} } },
  } as unknown as H3Event;
}

describe('makeStaticEndpoint', () => {
  it('returns markdown response from render fn', async () => {
    const handler = makeStaticEndpoint({ render: () => '# Static' });
    const res = (await handler(createFakeEvent())) as Response;
    // markdownResponse returns a Response object
    expect(res.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(await res.text()).toBe('# Static');
  });

  it('supports async render fn', async () => {
    const handler = makeStaticEndpoint({ render: async () => '# Async' });
    const res = (await handler(createFakeEvent())) as Response;
    expect(await res.text()).toBe('# Async');
  });
});

interface FakeEntry {
  id: string;
  data: { title?: string; description?: string };
  body?: string;
}

describe('makeListingEndpoint', () => {
  it('renders listing markdown with mapped items', async () => {
    const handler = makeListingEndpoint<FakeEntry>({
      collectionName: 'blog',
      siteUrl: 'https://example.com',
      basePath: '/blog',
      title: 'Blog',
      description: 'All posts.',
      getCollection: async () => [
        { id: 'a', data: { title: 'Post A', description: 'First' } },
        { id: 'b', data: { title: 'Post B' } },
      ],
    });
    const res = (await handler(createFakeEvent())) as Response;
    const body = await res.text();
    expect(body).toContain('# Blog');
    expect(body).toContain('> All posts.');
    expect(body).toContain('[Post A](/blog/a): First');
    expect(body).toContain('[Post B](/blog/b)');
  });

  it('respects sort', async () => {
    const handler = makeListingEndpoint<FakeEntry>({
      collectionName: 'blog',
      siteUrl: 'https://example.com',
      basePath: '/blog',
      title: 'T',
      description: 'd',
      getCollection: async () => [
        { id: 'b', data: { title: 'B' } },
        { id: 'a', data: { title: 'A' } },
      ],
      sort: (x, y) => x.id.localeCompare(y.id),
    });
    const res = (await handler(createFakeEvent())) as Response;
    const body = await res.text();
    expect(body.indexOf('(/blog/a)')).toBeLessThan(body.indexOf('(/blog/b)'));
  });
});

describe('makeParameterizedEndpoint', () => {
  it('invokes render with params', async () => {
    const handler = makeParameterizedEndpoint({
      getStaticPaths: () => [{ params: { category: 'engineering' } }],
      render: ({ params }) => `# Category: ${params.category}`,
    });
    const event = createFakeEvent('/categories/engineering.md');
    // For H3, params are in event.context.params for dynamic routes
    event.context.params = { category: 'engineering' };
    
    const res = (await handler(event)) as Response;
    expect(await res.text()).toBe('# Category: engineering');
  });
});

describe('makeLlmsTxtEndpoint', () => {
  it('renders llms.txt with text/plain content type', async () => {
    const handler = makeLlmsTxtEndpoint({
      brandName: 'Acme',
      description: 'Widgets.',
      sections: [
        {
          title: 'Products',
          links: [{ title: 'Widget', href: 'https://acme.test/widget' }],
        },
      ],
    });
    const res = (await handler(createFakeEvent())) as Response;
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(res.headers.get('x-robots-tag')).toBe('noindex');
    const body = await res.text();
    expect(body).toContain('# Acme');
    expect(body).toContain('> Widgets.');
    expect(body).toContain('## Products');
    expect(body).toContain('[Widget](https://acme.test/widget)');
  });
});
