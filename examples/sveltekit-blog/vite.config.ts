import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import dualmark from "@dualmark/sveltekit";
import dualmarkConfig from "./src/dualmark.config";

export default defineConfig({
  plugins: [dualmark(dualmarkConfig), sveltekit()],
});
