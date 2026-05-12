import { createDualmarkHandle } from "@dualmark/sveltekit";
import dualmarkConfig from "./dualmark.config";

export const handle = createDualmarkHandle(dualmarkConfig);
