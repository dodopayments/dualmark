import { defineNitroPlugin } from 'nitropack/runtime';
import { toMarkdownPath } from '@dualmark/core';
import type { H3Event } from 'h3';

/**
 * Injects `Link: <path.md>; rel="alternate"; type="text/markdown"` and
 * `Vary: Accept` into every HTML page response.
 *
 * Content negotiation (Accept: text/markdown, bot UA → serve markdown;
 * incompatible Accept → 406) is handled by the generated per-collection
 * Nitro middleware registered in module.ts — which runs BEFORE Nuxt SSR
 * and can pass-through for regular HTML requests by returning undefined.
 *
 * This plugin fires AFTER SSR renders the HTML body, giving us a reliable
 * place to append headers regardless of how the page was rendered.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (event) => {
    const res = event.node?.res;
    if (!res) return;

    const contentType =
      (res.getHeader('content-type') as string | undefined) ?? '';
    if (!contentType.toLowerCase().includes('text/html')) return;

    const pathname: string = (event.path ?? event.node?.req?.url ?? '/').split('?')[0];

    if (pathname.endsWith('.md')) return;

    const mdPath = toMarkdownPath(pathname);
    const linkValue = `<${mdPath}>; rel="alternate"; type="text/markdown"`;

    // Append to any pre-existing Link header rather than overwriting it.
    const existingLink = res.getHeader('link') as string | string[] | undefined;
    if (existingLink === undefined) {
      res.setHeader('link', linkValue);
    } else {
      const existingStr = Array.isArray(existingLink)
        ? existingLink.join(', ')
        : String(existingLink);
      // Don't double-add if a middleware already set it.
      if (!existingStr.includes('rel="alternate"')) {
        res.setHeader('link', `${existingStr}, ${linkValue}`);
      }
    }

    // Ensure `Vary: Accept` is present.
    const existingVary = res.getHeader('vary') as string | string[] | undefined;
    if (existingVary === undefined) {
      res.setHeader('vary', 'Accept');
    } else {
      const existingVaryStr = Array.isArray(existingVary)
        ? existingVary.join(', ')
        : String(existingVary);
      const varyTokens = existingVaryStr
        .split(',')
        .map((s) => s.trim().toLowerCase());
      if (!varyTokens.includes('accept')) {
        res.setHeader('vary', `${existingVaryStr}, Accept`);
      }
    }
  });
});
