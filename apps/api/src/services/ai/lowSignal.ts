import type { Profile } from "@clarity/shared";

const vaguePhrases = [
  "just ask",
  "bad at bios",
  "not sure what to write",
  "will fill this later",
  "figure it out"
];

export function detectLowSignalProfile(profile: Profile) {
  const text = [profile.bio, profile.whatDrainsMe, profile.whatINeedFromAPartner]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const indicators: string[] = [];
  const suggestions: string[] = [];

  if (!profile.bio || profile.bio.trim().length < 60) {
    indicators.push("Bio is still brief.");
    suggestions.push("Add a few lines about what dating with you actually feels like.");
  }

  if (!profile.whatDrainsMe) {
    indicators.push("What drains you is still blank.");
    suggestions.push("Name one or two situations that reliably drain your energy.");
  }

  if (!profile.whatINeedFromAPartner) {
    indicators.push("Partner needs are still blank.");
    suggestions.push("Add one concrete thing that helps you feel safe or understood.");
  }

  if (!profile.locationLabel) {
    indicators.push("Location is only broad city-level right now.");
    suggestions.push("Add a neighborhood or area to improve local matching.");
  }

  if (vaguePhrases.some((phrase) => text.includes(phrase))) {
    indicators.push("Some profile text still uses placeholder wording.");
    suggestions.push("Replace filler phrases with one real example or preference.");
  }

  return {
    score: Math.min(1, indicators.length / 5),
    indicators: indicators.slice(0, 4),
    suggestions: suggestions.slice(0, 4)
  };
}
