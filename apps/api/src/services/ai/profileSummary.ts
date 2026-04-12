import type { Profile, ProfileAnalysis, ProfileSummaryOutput } from "@clarity/shared";
import { humanizeEnum, joinNaturalLanguage, truncateAtWord } from "../../lib/format.js";
import { nowIso } from "../../lib/ids.js";
import { extractProfileTags } from "./communicationStyle.js";
import { detectProfileContradictions } from "./contradictions.js";
import { detectIntentClarity } from "./intentClarity.js";
import { detectLowSignalProfile } from "./lowSignal.js";

function sensorySummary(profile: Profile) {
  const parts: string[] = [];

  if (profile.sensoryProfile.calm) {
    parts.push(`${humanizeEnum(profile.sensoryProfile.calm)} calm`);
  }

  if (profile.sensoryProfile.noise) {
    parts.push(`${humanizeEnum(profile.sensoryProfile.noise)} noise tolerance`);
  }

  if (profile.sensoryProfile.crowd) {
    parts.push(`${humanizeEnum(profile.sensoryProfile.crowd)} crowd tolerance`);
  }

  return parts.length > 0 ? joinNaturalLanguage(parts) : "";
}

function buildCommunicationStyleNote(profile: Profile) {
  switch (profile.communicationStyle) {
    case "direct":
      return "Direct, explicit communication is likely to land best.";
    case "balanced":
      return "Clear communication with a little softness or context is likely to work best.";
    case "indirect":
      return "Gentler phrasing and lower-pressure check-ins are likely to land best.";
    default:
      return "Communication preferences still need a little more detail.";
  }
}

function determineClarityLevel(profile: Profile) {
  const lowSignal = detectLowSignalProfile(profile);
  const intent = detectIntentClarity(profile);
  const score = profile.profileCompleteness * 0.45 + intent.score * 0.4 + (1 - lowSignal.score) * 0.15;

  if (score >= 0.8) {
    return "high" as const;
  }

  if (score >= 0.55) {
    return "medium" as const;
  }

  return "low" as const;
}

export function buildProfileSummary(profile: Profile): ProfileSummaryOutput {
  const clauses: string[] = [];
  const lowSignal = detectLowSignalProfile(profile);

  if (profile.identity && profile.identity !== "prefer_not_to_say") {
    clauses.push(`${humanizeEnum(profile.identity)} identity`);
  }

  if (profile.communicationStyle) {
    clauses.push(`${humanizeEnum(profile.communicationStyle)} communication`);
  }

  if (profile.socialEnergy) {
    clauses.push(`${humanizeEnum(profile.socialEnergy)} social energy`);
  }

  const sensory = sensorySummary(profile);

  if (sensory) {
    clauses.push(`prefers ${sensory}`);
  }

  if (profile.routinePreference) {
    clauses.push(`${humanizeEnum(profile.routinePreference)} planning`);
  }

  if (profile.relationshipIntent) {
    clauses.push(`looking for ${humanizeEnum(profile.relationshipIntent)}`);
  }

  const shortSummary =
    clauses.length === 0
      ? "Insufficient data for a fuller summary yet."
      : clauses.join(", ").replace(/, ([^,]*)$/, ", and $1").concat(".");

  return {
    shortSummary: truncateAtWord(shortSummary.charAt(0).toUpperCase() + shortSummary.slice(1), 180),
    communicationStyleNote: buildCommunicationStyleNote(profile),
    clarityLevel: determineClarityLevel(profile),
    suggestion:
      lowSignal.indicators.length > 0 || profile.profileCompleteness < 0.7
        ? "Add more detail to improve matches."
        : undefined,
    generatedAt: nowIso()
  };
}

export function buildProfileAnalysis(profile: Profile): ProfileAnalysis {
  const lowSignal = detectLowSignalProfile(profile);
  const contradictions = detectProfileContradictions(profile);
  const intent = detectIntentClarity(profile);
  const tags = extractProfileTags(profile);
  const generatedSummary = profile.profileSummary ?? buildProfileSummary(profile);
  const improvementSuggestions = [...lowSignal.suggestions];

  if (tags.length < 3) {
    improvementSuggestions.push("Complete more structured fields so matching has clearer signal.");
  }

  if (generatedSummary.suggestion) {
    improvementSuggestions.push(generatedSummary.suggestion);
  }

  return {
    summary: generatedSummary.shortSummary,
    communicationStyleNote: generatedSummary.communicationStyleNote,
    clarityLevel: generatedSummary.clarityLevel,
    lowSignalIndicators: [...lowSignal.indicators, ...intent.notes].slice(0, 4),
    improvementSuggestions: improvementSuggestions.slice(0, 4),
    contradictionHints: contradictions.slice(0, 3),
    generatedAt: nowIso()
  };
}
