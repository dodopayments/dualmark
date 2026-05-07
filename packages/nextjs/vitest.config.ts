import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "@dualmark/nextjs",
    environment: "node",
    include: ["test/**/*.test.ts"],
    globals: false,
  },
});
