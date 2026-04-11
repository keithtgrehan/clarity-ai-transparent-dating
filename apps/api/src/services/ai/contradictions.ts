import type { Profile } from "@project-a-z/shared";

function textContains(text: string, phrases: string[]) {
  return phrases.some((phrase) => text.includes(phrase));
}

export function detectProfileContradictions(profile: Profile) {
  // TODO: Replace keyword heuristics with a reviewed semantic comparison flow once fixture coverage exists.
  const text = [profile.bio, profile.whatHelpsMeCommunicate, profile.idealFirstDate]
    .join(" ")
    .toLowerCase();
  const contradictions: string[] = [];

  if (
    profile.communicationPreferences.planningStyle === "scheduled" &&
    textContains(text, ["last minute only", "spur of the moment", "super spontaneous"])
  ) {
    contradictions.push("Structured planning preference conflicts with highly spontaneous profile language.");
  }

  if (
    profile.communicationPreferences.callPreference === "avoid_calls" &&
    textContains(text, ["call me anytime", "phone me", "love long calls"])
  ) {
    contradictions.push("Call preference conflicts with text that invites frequent phone calls.");
  }

  if (
    profile.sensoryPreferences.noiseTolerance === "low" &&
    textContains(text, ["loud bar", "big parties", "packed clubs"])
  ) {
    contradictions.push("Low noise tolerance conflicts with loud-date profile language.");
  }

  return contradictions;
}
