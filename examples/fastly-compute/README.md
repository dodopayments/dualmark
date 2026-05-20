# fastly-compute

Minimal Fastly Compute example for `@dualmark/fastly`.

## Run

1. Configure a backend named `origin_0` in `fastly.toml`
2. Ensure your origin serves both HTML pages and their `.md` twins
3. Start the local dev server:

```bash
fastly compute serve
```

4. Verify the example:

```bash
bunx @dualmark/cli verify http://127.0.0.1:7676/blog/edge-aeo
```
