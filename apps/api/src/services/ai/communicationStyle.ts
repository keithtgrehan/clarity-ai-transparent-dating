import type { Profile } from "@project-a-z/shared";

function includesAny(text: string, candidates: string[]) {
  return candidates.some((candidate) => text.includes(candidate));
}

export function extractCommunicationStyle(profile: Profile) {
  const sourceText = [
    profile.bio,
    profile.whatHelpsMeCommunicate,
    profile.idealFirstDate,
    profile.communicationPreferences.notes ?? ""
  ]
    .join(" ")
    .toLowerCase();

  const tags = new Set<string>();

  tags.add(profile.communicationPreferences.directness.replaceAll("_", " "));
  tags.add(profile.communicationPreferences.planningStyle.replaceAll("_", " "));
  tags.add(profile.communicationPreferences.callPreference.replaceAll("_", " "));

  if (includesAny(sourceText, ["direct", "clear", "specific"])) {
    tags.add("values explicit language");
  }

  if (includesAny(sourceText, ["plan ahead", "calendar", "scheduled"])) {
    tags.add("likes planned dates");
  }

  if (includesAny(sourceText, ["texting", "texts", "message"])) {
    tags.add("text-centered communication");
  }

  if (includesAny(sourceText, ["quiet", "slow", "gentle"])) {
    tags.add("prefers low-pressure pacing");
  }

  return Array.from(tags).slice(0, 6);
}
