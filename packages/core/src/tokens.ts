export type TokenEstimator = (text: string) => number;

export interface EstimateTokensOptions {
  tokenizer?: TokenEstimator;
}

const defaultEstimator: TokenEstimator = (text) => text.split(/\s+/).filter(Boolean).length;

let currentEstimator: TokenEstimator = defaultEstimator;

export function estimateTokens(text: string, options?: EstimateTokensOptions): number {
  const fn = options?.tokenizer ?? currentEstimator;
  return fn(text);
}

export function setTokenEstimator(fn: TokenEstimator): void {
  currentEstimator = fn;
}

export function resetTokenEstimator(): void {
  currentEstimator = defaultEstimator;
}
