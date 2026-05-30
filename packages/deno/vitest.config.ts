import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "@dualmark/deno",
    environment: "node",
    include: ["test/**/*.test.ts"],
    globals: false,
  },
});
