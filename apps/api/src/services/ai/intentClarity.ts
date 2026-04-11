import type { Profile } from "@project-a-z/shared";

const uncertaintyPhrases = ["not sure", "see what happens", "go with the flow", "figure it out"];

export function detectIntentClarity(profile: Profile) {
  const text = [profile.bio, profile.relationshipIntent.notes ?? ""].join(" ").toLowerCase();
  const notes: string[] = [];

  if (uncertaintyPhrases.some((phrase) => text.includes(phrase))) {
    notes.push("Text suggests uncertainty about relationship direction.");
  }

  if (
    profile.relationshipIntent.primary === "life_partner" &&
    profile.relationshipIntent.pacing === "flexible"
  ) {
    notes.push("Long-horizon intent is clear, but pacing is intentionally flexible.");
  }

  const score = Math.max(0, 1 - notes.length * 0.35);

  return {
    score,
    isClear: score >= 0.65,
    notes
  };
}
