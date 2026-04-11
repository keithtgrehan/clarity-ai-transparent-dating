import { readFile } from "node:fs/promises";
import { LocalDataStoreSchema, type LocalDataStore } from "@clarity/shared";
import { resolveRepoPath } from "./paths.js";
import { writeStore } from "./store.js";

const berlinSeedBundlePath = resolveRepoPath("data/seeds/berlin_seed_bundle.json");

export async function loadSeedBundle() {
  const raw = await readFile(berlinSeedBundlePath, "utf8");
  return LocalDataStoreSchema.parse(JSON.parse(raw));
}

export async function resetStoreFromSeeds() {
  const seedBundle = await loadSeedBundle();
  await writeStore(seedBundle);
  return seedBundle;
}

export function summarizeStoreCounts(store: LocalDataStore) {
  return {
    users: store.users.length,
    profiles: store.profiles.length,
    conversations: store.conversations.length,
    messages: store.messages.length,
    reports: store.reports.length,
    waitlistLeads: store.waitlistLeads.length,
    moderationFlags: store.moderationFlags.length
  };
}
