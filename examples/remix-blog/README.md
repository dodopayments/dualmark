# dualmark-example-remix-blog

React Router v7 Framework Mode example for `@dualmark/remix`.

## Run

```bash
bun install
bun run --filter @dualmark/remix build
bun run dev
```

## Verify

```bash
curl -sI http://localhost:5174/posts/hello
curl -sI -H "User-Agent: GPTBot/1.0" -H "Accept: text/markdown" http://localhost:5174/posts/hello
curl -sI http://localhost:5174/posts/hello.md
bun run verify
```

Expected: browser HTML advertises `Link rel="alternate"`, bot and direct `.md` requests return `text/markdown`, and conformance scores at least `120/125`.

## Production serve

`react-router-serve` defaults to port `3000`.

```bash
bun run build
bun run start
node ../../packages/cli/dist/cli.js verify http://localhost:3000/posts/hello
```
