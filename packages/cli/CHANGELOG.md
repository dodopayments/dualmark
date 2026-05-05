# @dualmark/cli

## 0.2.0

### Minor Changes

- 5e49dc2: `dualmark verify --help` and `dualmark verify -h` now print help and exit 0, matching standard CLI UX. Previously these exited 2 ("missing `<url>`") because the parser only recognized help flags as the first argument. Internal refactor: `cli.ts` is now a thin shim over `main.ts` to eliminate duplicated parsing logic.

### Patch Changes

- Updated dependencies [5e49dc2]
  - @dualmark/core@0.2.0
