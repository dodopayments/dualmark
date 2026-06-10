export interface SanityExampleEnv {
  fixtureMode: boolean;
  projectId?: string;
  dataset?: string;
  apiVersion: string;
}

export function getSanityExampleEnv(env: NodeJS.ProcessEnv = process.env): SanityExampleEnv {
  const projectId = env.PUBLIC_SANITY_PROJECT_ID?.trim() || undefined;
  const dataset = env.PUBLIC_SANITY_DATASET?.trim() || undefined;
  const apiVersion = env.PUBLIC_SANITY_API_VERSION?.trim() || "2026-06-10";
  const fixtureMode = env.SANITY_FIXTURE_MODE !== "false" || !projectId || !dataset;

  return { fixtureMode, projectId, dataset, apiVersion };
}
