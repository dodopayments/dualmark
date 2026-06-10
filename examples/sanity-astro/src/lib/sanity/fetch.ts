import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createClient } from "@sanity/client";
import { getSanityExampleEnv } from "./env";
import { glossaryTermsQuery, postsQuery } from "./queries";
import type { SanityFixtureExport, SanityGlossaryTerm, SanityPost } from "./types";

const fixtureUrl = new URL("../../fixtures/sanity-export.json", import.meta.url);

async function readFixtures(): Promise<SanityFixtureExport> {
  const json = await readFile(fileURLToPath(fixtureUrl), "utf8");
  return JSON.parse(json) as SanityFixtureExport;
}

function createSanityClient() {
  const env = getSanityExampleEnv();
  if (process.env.SANITY_FIXTURE_MODE === "false" && (!env.projectId || !env.dataset)) {
    console.warn(
      "SANITY_FIXTURE_MODE=false was set, but PUBLIC_SANITY_PROJECT_ID or PUBLIC_SANITY_DATASET is missing. Falling back to local Sanity fixtures.",
    );
  }

  if (env.fixtureMode) return undefined;
  if (!env.projectId || !env.dataset) return undefined;

  return createClient({
    projectId: env.projectId,
    dataset: env.dataset,
    apiVersion: env.apiVersion,
    useCdn: false,
  });
}

export async function getPosts(): Promise<SanityPost[]> {
  const client = createSanityClient();
  if (!client) return (await readFixtures()).posts;
  return client.fetch<SanityPost[]>(postsQuery);
}

export async function getGlossaryTerms(): Promise<SanityGlossaryTerm[]> {
  const client = createSanityClient();
  if (!client) return (await readFixtures()).glossaryTerms;
  return client.fetch<SanityGlossaryTerm[]>(glossaryTermsQuery);
}
