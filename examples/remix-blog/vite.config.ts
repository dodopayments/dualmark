import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import dualmark from "@dualmark/remix";
import dualmarkConfig from "./app/dualmark.config";

export default defineConfig({
  plugins: [dualmark(dualmarkConfig), reactRouter()],
});
