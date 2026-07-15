import type { CommunicationAnalysisRequest } from "@clarity/shared";
import { createHash } from "node:crypto";

type FixtureId = CommunicationAnalysisRequest["fixtureId"];

export type SyntheticSignalFixture = {
  id: FixtureId;
  languageTag: "en-GB" | "en-US" | "en-EU";
  text: string;
};

const fixtures: Record<FixtureId, SyntheticSignalFixture> = {
  wording_us_direct: {
    id: "wording_us_direct",
    languageTag: "en-US",
    text: "I would like to meet on Saturday afternoon. If that does not work, another day is fine."
  },
  wording_gb_repair: {
    id: "wording_gb_repair",
    languageTag: "en-GB",
    text: "I think my earlier note was unclear. What I meant was: maybe we could meet on Saturday afternoon, if that is okay."
  },
  structure_eu_transition: {
    id: "structure_eu_transition",
    languageTag: "en-EU",
    text: "By the way, the museum sounds good. Looping back, I prefer a quiet cafe first, and then I can decide after I check the time."
  },
  low_signal_greeting: {
    id: "low_signal_greeting",
    languageTag: "en-EU",
    text: "Hello there."
  }
};

const expectedSha256: Record<FixtureId, string> = {
  wording_us_direct: "867f38da20f6783e2c49186d2a0bb8f4271c8135cc7a2f22528919859d9aafe1",
  wording_gb_repair: "efda7e14c6854c8208bbe9e8db127119967ab690b1f3ff941b443fa308be4f89",
  structure_eu_transition: "7036a4895fc20cbb229d752e7b8e8bd597de66ac0c09593b850d26983534aa1e",
  low_signal_greeting: "23ea498e82f4435b1c135324eedef4ba64061600897077bf76082a50b41a9c13"
};

for (const fixture of Object.values(fixtures)) {
  const actual = createHash("sha256").update(fixture.text, "utf8").digest("hex");
  if (actual !== expectedSha256[fixture.id]) {
    throw new Error(`Tracked synthetic fixture hash mismatch: ${fixture.id}.`);
  }
}

export function resolveSyntheticSignalFixture(id: FixtureId) {
  return fixtures[id];
}
