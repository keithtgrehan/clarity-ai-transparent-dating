import type { Profile } from "@clarity/shared";
import { humanizeEnum } from "../../lib/format.js";

const uncertaintyPhrases = [
  "whatever happens",
  "see where it goes",
  "go with the flow",
  "not sure what i want",
  "open to anything"
];

export function detectIntentClarity(profile: Profile) {
  const text = [profile.bio, profile.whatINeedFromAPartner].filter(Boolean).join(" ").toLowerCase();
  const notes: string[] = [];

  if (!profile.relationshipIntent) {
    notes.push("Relationship intent is still missing.");
  }

  if (uncertaintyPhrases.some((phrase) => text.includes(phrase))) {
    notes.push("Written text is still vague about dating intent.");
  }

  if (profile.relationshipIntent === "exploring_with_clarity" && !profile.whatINeedFromAPartner) {
    notes.push("Exploring with clarity would benefit from a concrete note about what clarity means.");
  }

  return {
    score: Math.max(0, 1 - notes.length * 0.35),
    notes,
    label: profile.relationshipIntent ? humanizeEnum(profile.relationshipIntent) : "unset"
  };
}
