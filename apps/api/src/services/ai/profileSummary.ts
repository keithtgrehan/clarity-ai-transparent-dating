import type { Profile, ProfileAnalysis } from "@clarity/shared";
import { humanizeEnum, joinNaturalLanguage } from "../../lib/format.js";
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

export function buildProfileSummary(profile: Profile) {
  const clauses: string[] = [];

  if (profile.communicationStyle) {
    clauses.push(`${humanizeEnum(profile.communicationStyle)} communicator`);
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

  if (clauses.length === 0) {
    return "Insufficient data for a fuller summary yet.";
  }

  const sentence = clauses.join(", ").replace(/, ([^,]*)$/, ", and $1").concat(".");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1, 180);
}

export function buildProfileAnalysis(profile: Profile): ProfileAnalysis {
  const lowSignal = detectLowSignalProfile(profile);
  const contradictions = detectProfileContradictions(profile);
  const intent = detectIntentClarity(profile);
  const tags = extractProfileTags(profile);
  const summary = profile.summary?.trim() || buildProfileSummary(profile);
  const improvementSuggestions = [...lowSignal.suggestions];

  if (tags.length < 3) {
    improvementSuggestions.push("Complete more structured fields so matching has clearer signal.");
  }

  if (profile.profileCompleteness < 0.6) {
    improvementSuggestions.push("Finish the core onboarding steps before relying on matches.");
  }

  return {
    summary,
    lowSignalIndicators: [...lowSignal.indicators, ...intent.notes].slice(0, 4),
    improvementSuggestions: improvementSuggestions.slice(0, 4),
    contradictionHints: contradictions.slice(0, 3),
    generatedAt: nowIso()
  };
}
