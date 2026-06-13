# Fastly Compute Example

This directory contains a minimal working example of the Dualmark Fastly Compute adapter.

## Setup

1. Install dependencies at the monorepo root:
```bash
bun install
```

2. Build the packages at the monorepo root:
```bash
bun run build
```

3. Update the `backend` address:
> [!IMPORTANT]
> Before running this example, you **must** update the backend address in `fastly.toml` to point to a real backend that serves your HTML and Markdown content, instead of `example.com`.

## Running locally

Use the Fastly CLI to serve the application locally:
```bash
fastly compute serve
```

Test an AI bot request:
```bash
curl -H "User-Agent: GPTBot/1.0" http://127.0.0.1:7676/
```
