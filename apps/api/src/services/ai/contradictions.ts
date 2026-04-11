import type { Profile } from "@clarity/shared";

function includesAny(text: string, phrases: string[]) {
  return phrases.some((phrase) => text.includes(phrase));
}

export function detectProfileContradictions(profile: Profile) {
  const text = [profile.bio, profile.whatDrainsMe, profile.whatINeedFromAPartner]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const contradictions: string[] = [];

  if (
    profile.communicationStyle === "direct" &&
    includesAny(text, ["read between the lines", "pick up the hint", "just know what i mean"])
  ) {
    contradictions.push("Profile asks for directness but the text also expects hints to be inferred.");
  }

  if (
    profile.communicationStyle === "indirect" &&
    includesAny(text, ["say it bluntly", "be very direct", "tell me exactly"])
  ) {
    contradictions.push("Profile prefers indirect communication but the text asks for blunt clarity.");
  }

  if (
    profile.routinePreference === "routine" &&
    includesAny(text, ["last minute only", "spur of the moment", "totally random plans"])
  ) {
    contradictions.push("Routine preference conflicts with text that asks for very last-minute plans.");
  }

  if (
    profile.sensoryProfile.calm === "essential" &&
    includesAny(text, ["packed clubs", "loud bars", "chaotic nightlife"])
  ) {
    contradictions.push("Calm is marked as essential, but the text points toward loud or crowded dates.");
  }

  return contradictions;
}
