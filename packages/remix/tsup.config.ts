import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/routes.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: "es2022",
  external: [
    "@dualmark/core",
    "@dualmark/converters",
    "@react-router/dev/routes",
    "react-router",
    "vite",
  ],
});
