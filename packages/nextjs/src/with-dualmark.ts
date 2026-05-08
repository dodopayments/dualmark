import { resolveConfig } from "./config-validation.js";
import type { DualmarkNextConfig } from "./types.js";

interface NextConfigShape {
  transpilePackages?: string[];
}

const REQUIRED_TRANSPILE = ["@dualmark/core", "@dualmark/converters", "@dualmark/nextjs"] as const;

export function withDualmark<T extends NextConfigShape>(
  nextConfig: T | undefined,
  options: DualmarkNextConfig,
): T {
  resolveConfig(options);
  const base = (nextConfig ?? ({} as T)) as T;
  const existing = base.transpilePackages ?? [];
  const merged = Array.from(new Set([...existing, ...REQUIRED_TRANSPILE]));
  return {
    ...base,
    transpilePackages: merged,
  } as T;
}
