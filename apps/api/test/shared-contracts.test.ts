import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { LocalDataStoreSchema, SubmitOnboardingInputSchema } from "@clarity/shared";
import { resolveRepoPath } from "../src/lib/paths.js";
import { getLegacyOnboardingPayload, withSyntheticApp } from "./helpers.js";

test("tracked seed bundle is valid synthetic local-store data", { timeout: 10_000 }, async () => {
  const seed = JSON.parse(await readFile(resolveRepoPath("data/seeds/berlin_seed_bundle.json"), "utf8"));
  assert.doesNotThrow(() => LocalDataStoreSchema.parse(seed));
});

test("legacy onboarding contract remains characterized without endorsing it", { timeout: 10_000 }, async () => {
  await withSyntheticApp(async (app) => {
    const valid = await getLegacyOnboardingPayload(app);
    assert.equal(SubmitOnboardingInputSchema.safeParse(valid).success, true);

    for (const key of ["identity", "diagnosisStatus"] as const) {
      const profile = { ...valid.profile };
      delete profile[key];
      assert.equal(SubmitOnboardingInputSchema.safeParse({ ...valid, profile }).success, false);
    }

    assert.equal(
      SubmitOnboardingInputSchema.safeParse({
        ...valid,
        profile: { ...valid.profile, sensoryProfile: { noise: "low", crowd: "medium" } }
      }).success,
      false
    );
    assert.equal(
      SubmitOnboardingInputSchema.safeParse({ ...valid, profile: { ...valid.profile, age: 17 } }).success,
      false
    );
  });
});
