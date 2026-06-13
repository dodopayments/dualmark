import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  treeshake: true,
  external: ["@dualmark/core", "@fastly/js-compute"],
  target: "es2022",
});
