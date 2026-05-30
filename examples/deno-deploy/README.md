# examples/deno-deploy

End-to-end example of `@dualmark/deno` running under `Deno.serve`. Scores **125/125** on `dualmark verify`.

## Prerequisites

This example imports `@dualmark/deno` and `@dualmark/core` directly from their built `dist/` directories. Build the workspace packages first:

```bash
bun install
bun run --filter @dualmark/deno --filter @dualmark/core build
```

## Run

```bash
deno task dev
# server listening on http://localhost:8000
```

## Test

```bash
deno task test
```

## Verify

With the server running in another terminal:

```bash
bunx @dualmark/cli verify http://localhost:8000/pricing
```

Expected output:

```
Score: 125/125
```

## What's in here

- `main.ts` : `Deno.serve` wrapping `createAEOHandler` with a tiny static file reader as `upstream`
- `main_test.ts` : `Deno.test` smoke tests: HTML for browsers, markdown for AI bots, content negotiation, 404
- `content/pricing.html` : sample HTML page
- `content/pricing.md` : sample markdown twin
- `deno.json` : Deno tasks and import map pointing at the built workspace packages
