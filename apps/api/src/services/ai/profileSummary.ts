import type { Profile, ProfileSummary } from "@project-a-z/shared";
import { nowIso } from "../../lib/ids.js";
import { extractCommunicationStyle } from "./communicationStyle.js";
import { detectIntentClarity } from "./intentClarity.js";
import { detectLowSignalProfile } from "./lowSignal.js";

export function buildProfileSummary(profile: Profile): ProfileSummary {
  // TODO: Swap in prompt-based summarization only after eval fixtures show it beats this deterministic baseline.
  const communicationTags = extractCommunicationStyle(profile);
  const lowSignal = detectLowSignalProfile(profile);
  const intentClarity = detectIntentClarity(profile);

  const cautionNotes = [...lowSignal.indicators, ...intentClarity.notes].slice(0, 4);
  const relationshipLabel = profile.relationshipIntent.primary.replaceAll("_", " ");

  return {
    userId: profile.userId,
    headline: `${profile.displayName} is looking for ${relationshipLabel}.`,
    summary: `${profile.displayName} prefers ${profile.communicationPreferences.directness.replaceAll(
      "_",
      " "
    )} communication, enjoys ${profile.sensoryPreferences.dateEnvironments[0].replaceAll(
      "_",
      " "
    )}, and values ${profile.whatHelpsMeCommunicate.toLowerCase()}`.slice(0, 280),
    communicationTags,
    lowSignalIndicators: lowSignal.indicators.slice(0, 6),
    cautionNotes,
    generatedAt: nowIso(),
    editableByUser: true
  };
}
