import { describe, it, expect, vi } from 'vitest';
import type { H3Event } from 'h3';

vi.mock('nitropack/runtime', () => ({
  defineNitroPlugin: (fn: any) => fn
}));

import plugin from '../src/runtime/server/plugin';

describe('Nitro server plugin', () => {
  it('injects Link rel=alternate and Vary on HTML responses', () => {
    let hookCallback: any;
    const fakeNitroApp = {
      hooks: {
        hook: (name: string, cb: any) => {
          if (name === 'beforeResponse') hookCallback = cb;
        },
      },
    };

    plugin(fakeNitroApp as any);

    const headers: Record<string, string | string[]> = {
      'content-type': 'text/html; charset=utf-8',
    };

    const fakeEvent = {
      path: '/blog/hello',
      node: {
        res: {
          getHeader: (key: string) => headers[key.toLowerCase()],
          setHeader: (key: string, value: string) => {
            headers[key.toLowerCase()] = value;
          },
        },
      },
    } as unknown as H3Event;

    hookCallback(fakeEvent);

    expect(headers['link']).toContain('</blog/hello.md>; rel="alternate"; type="text/markdown"');
    expect(headers['vary']).toContain('Accept');
  });

  it('does not modify non-HTML responses', () => {
    let hookCallback: any;
    const fakeNitroApp = {
      hooks: {
        hook: (name: string, cb: any) => {
          if (name === 'beforeResponse') hookCallback = cb;
        },
      },
    };

    plugin(fakeNitroApp as any);

    const headers: Record<string, string | string[]> = {
      'content-type': 'application/json',
    };

    const fakeEvent = {
      path: '/data.json',
      node: {
        res: {
          getHeader: (key: string) => headers[key.toLowerCase()],
          setHeader: (key: string, value: string) => {
            headers[key.toLowerCase()] = value;
          },
        },
      },
    } as unknown as H3Event;

    hookCallback(fakeEvent);

    expect(headers['link']).toBeUndefined();
    expect(headers['vary']).toBeUndefined();
  });

  it('does not modify .md responses', () => {
    let hookCallback: any;
    const fakeNitroApp = {
      hooks: {
        hook: (name: string, cb: any) => {
          if (name === 'beforeResponse') hookCallback = cb;
        },
      },
    };

    plugin(fakeNitroApp as any);

    const headers: Record<string, string | string[]> = {
      'content-type': 'text/html; charset=utf-8', // even if it's html type but path ends with .md
    };

    const fakeEvent = {
      path: '/blog/hello.md',
      node: {
        res: {
          getHeader: (key: string) => headers[key.toLowerCase()],
          setHeader: (key: string, value: string) => {
            headers[key.toLowerCase()] = value;
          },
        },
      },
    } as unknown as H3Event;

    hookCallback(fakeEvent);

    expect(headers['link']).toBeUndefined();
    expect(headers['vary']).toBeUndefined();
  });

  it('uses /index.md for root', () => {
    let hookCallback: any;
    const fakeNitroApp = {
      hooks: {
        hook: (name: string, cb: any) => {
          if (name === 'beforeResponse') hookCallback = cb;
        },
      },
    };

    plugin(fakeNitroApp as any);

    const headers: Record<string, string | string[]> = {
      'content-type': 'text/html; charset=utf-8',
    };

    const fakeEvent = {
      path: '/',
      node: {
        res: {
          getHeader: (key: string) => headers[key.toLowerCase()],
          setHeader: (key: string, value: string) => {
            headers[key.toLowerCase()] = value;
          },
        },
      },
    } as unknown as H3Event;

    hookCallback(fakeEvent);

    expect(headers['link']).toContain('</index.md>; rel="alternate"; type="text/markdown"');
    expect(headers['vary']).toContain('Accept');
  });
});
