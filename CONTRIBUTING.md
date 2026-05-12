# Contributing to Dualmark

Thanks for your interest in contributing.

## Development setup

Requirements: Node 18+, bun 1.3+.

```bash
bun install
bun run build
bun run test
```

## Project layout

```
dualmark/
├── packages/
│   ├── core/          @dualmark/core
│   ├── converters/    @dualmark/converters
│   ├── astro/         @dualmark/astro
│   ├── cloudflare/    @dualmark/cloudflare
│   └── cli/           @dualmark/cli
├── examples/
├── apps/
└── spec/
```

## Workflow

1. Fork and branch from `main`.
2. Make changes. Add tests. Run `bun run test` and `bun run typecheck`.
3. Add a changeset: `bun run changeset`. Pick affected packages and bump type.
4. Open a PR. CI must pass.

## Conventions

- TypeScript strict mode.
- No `as any`, no `@ts-ignore`, no `@ts-expect-error` without an inline reason.
- Prefer existing code style. Run `bun run format` (Prettier) before committing.
- Tests live next to source as `*.test.ts`.

## Release flow (maintainers)

Releases are split into two explicit steps so a stray commit on `main` can never publish to npm.

### Step 1 — Version PR (automatic)

When changesets land on `main`, the **`Version (PR bot)`** workflow opens or updates a PR titled `chore: version packages`. The PR contains:

- `package.json` version bumps for all affected `@dualmark/*` packages
- Generated `CHANGELOG.md` entries
- Removal of consumed `.changeset/*.md` files

Review and merge that PR when you're ready to cut a release.

### Step 2 — GitHub Release (manual gate)

After the version PR merges:

1. Go to **GitHub → Releases → Draft a new release**.
2. Click **Choose a tag** and create a new tag matching the version, e.g. `v0.3.0`.
3. Set release title and notes (the changelog entry is a good source).
4. Click **Publish release**.

Publishing the release fires the **`Release (npm publish)`** workflow which:

- Checks out the exact tag
- Builds + tests + typechecks all `@dualmark/*` packages
- Verifies at least one package version matches the tag
- Packs each `packages/*` with `bun pm pack --quiet` (rewrites `workspace:*` deps to concrete versions in the tarball)
- Publishes each tarball with `npm publish <tarball> --provenance --access public --tag latest`, which:
  - Uploads the pre-packed tarball
  - Generates a [Sigstore-backed npm provenance attestation](https://docs.npmjs.com/generating-provenance-statements) tying the published artifact to this exact workflow run + commit SHA (visible as a "Provenance" badge on the package's npm page)
- Auth via `NODE_AUTH_TOKEN` env (wired into `~/.npmrc` by `actions/setup-node` in the composite setup action)
- Skips packages already at that version on the registry (idempotent re-runs)

Why `bun pm pack` + `npm publish` instead of just `bun publish`? As of bun 1.3.5, `bun publish` does not yet support `--provenance` (tracked at [oven-sh/bun#15601](https://github.com/oven-sh/bun/issues/15601)). When that ships in a stable bun release, the two-step flow collapses back to a single `bun publish --provenance` call.

If anything fails, the release is on GitHub but nothing is on npm — fix and re-run the workflow via **Actions → Release → Run workflow** with the tag as input.

### Verifying provenance

Consumers (and you) can verify any `@dualmark/*` tarball's provenance attestation with:

```bash
npm audit signatures
# or, per-package:
npm view @dualmark/core --json | grep -A2 attestations
```

### Why two workflows

`changesets/action@v1` can do both versioning and publishing in one step, but that means *every* push to `main` with a pending changeset can publish. Splitting them puts the publish behind an explicit human action (drafting a release in the UI), and keeps the version PR loop convenient for contributors.

## Code of Conduct

Be excellent to each other. We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

## License

By contributing, you agree your work is licensed under the Apache License 2.0 (see [LICENSE](./LICENSE) and [NOTICE](./NOTICE)).
