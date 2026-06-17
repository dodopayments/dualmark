import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/module.ts",
    "src/runtime/server/converter-registry.ts",
    "src/runtime/server/plugin.ts",
    "src/runtime/server/endpoints/listing.ts",
    "src/runtime/server/endpoints/middleware.ts",
    "src/runtime/server/endpoints/parameterized.ts",
    "src/runtime/server/endpoints/static.ts",
    "src/runtime/server/endpoints/llms-txt.ts",
  ],
  format: ["esm", "cjs"],
  dts: { entry: ["src/index.ts"] },
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: "es2022",
  external: [
    "@dualmark/core",
    "@dualmark/converters",
    "@nuxt/kit",
    "@nuxt/schema",
    "nuxt",
    "nitropack",
    "h3",
  ],
});
