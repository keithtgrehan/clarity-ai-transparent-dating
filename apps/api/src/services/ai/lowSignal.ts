import type { Profile } from "@project-a-z/shared";

const lowSignalPhrases = [
  "ask me",
  "bad at bios",
  "not sure what to write",
  "just ask",
  "will fill this later"
];

export function detectLowSignalProfile(profile: Profile) {
  const indicators: string[] = [];
  const sourceText = [profile.bio, profile.whatHelpsMeCommunicate, profile.idealFirstDate]
    .join(" ")
    .toLowerCase();

  if (profile.bio.length < 80) {
    indicators.push("Bio is still very short.");
  }

  if (profile.interests.length < 3) {
    indicators.push("Interests list is thin for matching.");
  }

  if (profile.whatHelpsMeCommunicate.length < 50) {
    indicators.push("Communication support notes could be more specific.");
  }

  if (lowSignalPhrases.some((phrase) => sourceText.includes(phrase))) {
    indicators.push("Profile copy contains filler or placeholder phrasing.");
  }

  const score = Math.min(1, indicators.length / 4);

  return {
    score,
    indicators
  };
}
