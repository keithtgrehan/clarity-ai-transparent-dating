import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { resetStoreFromSeeds } from "../src/lib/seeds.js";

export async function withSyntheticApp(run: (app: FastifyInstance) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), "clarity-test-"));
  const previousStorageFile = process.env.API_STORAGE_FILE;
  process.env.API_STORAGE_FILE = join(directory, "store.json");
  let app: FastifyInstance | undefined;

  try {
    await resetStoreFromSeeds();
    app = await buildApp({ logger: false });
    await run(app);
  } finally {
    await app?.close();
    await rm(directory, { recursive: true, force: true });
    if (previousStorageFile === undefined) {
      delete process.env.API_STORAGE_FILE;
    } else {
      process.env.API_STORAGE_FILE = previousStorageFile;
    }
  }
}

export async function getLegacyOnboardingPayload(app: FastifyInstance) {
  const response = await app.inject({ method: "GET", url: "/api/profiles/user-you" });
  const profile = response.json().profile;
  return {
    userId: "user-you",
    profile: {
      ...profile,
      displayName: "Riley",
      age: 30,
      locationLabel: "Synthetic Berlin location",
      identity: "audhd",
      openTo: ["adhd", "autism", "audhd"],
      diagnosisStatus: "self_identified",
      communicationStyle: "direct",
      socialEnergy: "medium",
      sensoryProfile: { noise: "low", crowd: "medium", calm: "essential" },
      routinePreference: "balanced",
      relationshipIntent: "dating_with_intent",
      bio: "Synthetic test profile with direct communication and calm plans.",
      whatDrainsMe: "Ambiguous synthetic plans.",
      whatINeedFromAPartner: "Clear synthetic expectations."
    }
  };
}
