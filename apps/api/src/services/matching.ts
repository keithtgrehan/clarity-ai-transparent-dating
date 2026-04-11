import type { MatchCandidate, Profile } from "@project-a-z/shared";
import { nowIso } from "../lib/ids.js";
import { buildProfileSummary } from "./ai/profileSummary.js";
import { detectIntentClarity } from "./ai/intentClarity.js";
import { detectLowSignalProfile } from "./ai/lowSignal.js";
import { detectProfileContradictions } from "./ai/contradictions.js";

function average(scores: number[]) {
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function overlapScore(left: string[], right: string[]) {
  const leftSet = new Set(left.map((item) => item.toLowerCase()));
  const overlapCount = right.filter((item) => leftSet.has(item.toLowerCase())).length;

  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  return Math.min(100, Math.round((overlapCount / Math.max(left.length, right.length)) * 100));
}

function scoreRelationshipIntent(user: Profile, candidate: Profile) {
  if (user.relationshipIntent.primary === candidate.relationshipIntent.primary) {
    return 100;
  }

  const seriousIntentSet = new Set([
    "long_term_relationship",
    "life_partner",
    "dating_with_intent"
  ]);

  if (
    seriousIntentSet.has(user.relationshipIntent.primary) &&
    seriousIntentSet.has(candidate.relationshipIntent.primary)
  ) {
    return 78;
  }

  if (
    user.relationshipIntent.primary === "exploring_with_clarity" ||
    candidate.relationshipIntent.primary === "exploring_with_clarity"
  ) {
    return 58;
  }

  return 25;
}

function scoreCommunicationStyle(user: Profile, candidate: Profile) {
  const scores = [
    user.communicationPreferences.directness === candidate.communicationPreferences.directness ? 100 : 70,
    user.communicationPreferences.planningStyle === candidate.communicationPreferences.planningStyle ? 100 : 65,
    user.communicationPreferences.messageLength === candidate.communicationPreferences.messageLength ? 100 : 75,
    user.communicationPreferences.callPreference === candidate.communicationPreferences.callPreference ? 100 : 70
  ];

  return Math.round(average(scores));
}

function scoreSensoryFit(user: Profile, candidate: Profile) {
  const environmentScore = overlapScore(
    user.sensoryPreferences.dateEnvironments,
    candidate.sensoryPreferences.dateEnvironments
  );

  const scores = [
    environmentScore,
    user.sensoryPreferences.noiseTolerance === candidate.sensoryPreferences.noiseTolerance ? 100 : 70,
    user.sensoryPreferences.crowdTolerance === candidate.sensoryPreferences.crowdTolerance ? 100 : 70,
    user.sensoryPreferences.touchPace === candidate.sensoryPreferences.touchPace ? 100 : 60
  ];

  return Math.round(average(scores));
}

function scorePacingAndPlanning(user: Profile, candidate: Profile) {
  const scores = [
    user.relationshipIntent.pacing === candidate.relationshipIntent.pacing ? 100 : 70,
    user.communicationPreferences.responseCadence ===
    candidate.communicationPreferences.responseCadence
      ? 100
      : 68,
    user.communicationPreferences.initiationPreference ===
    candidate.communicationPreferences.initiationPreference
      ? 100
      : 74
  ];

  return Math.round(average(scores));
}

function scoreBerlinLogistics(user: Profile, candidate: Profile) {
  const areaScore = overlapScore(user.berlinAreas, candidate.berlinAreas);
  const languageScore = overlapScore(user.languages, candidate.languages);

  return Math.round(average([areaScore, languageScore]));
}

function scoreProfileSignal(candidate: Profile) {
  // TODO: Replace this hand-tuned signal score with a reviewed rubric tied to pilot outcomes.
  const lowSignal = detectLowSignalProfile(candidate);
  const clarity = detectIntentClarity(candidate);
  const contradictionPenalty = detectProfileContradictions(candidate).length * 12;

  const rawScore = candidate.profileCompleteness * 100 - lowSignal.score * 25 + clarity.score * 10;
  return Math.max(0, Math.min(100, Math.round(rawScore - contradictionPenalty)));
}

function buildReasons(user: Profile, candidate: Profile) {
  const reasons: string[] = [];

  if (user.relationshipIntent.primary === candidate.relationshipIntent.primary) {
    reasons.push("Shared relationship intent is strongly aligned.");
  }

  if (user.communicationPreferences.planningStyle === candidate.communicationPreferences.planningStyle) {
    reasons.push("Planning style looks compatible for predictable dating.");
  }

  if (overlapScore(user.sensoryPreferences.dateEnvironments, candidate.sensoryPreferences.dateEnvironments) >= 50) {
    reasons.push("There is overlap in preferred first-date environments.");
  }

  if (overlapScore(user.languages, candidate.languages) >= 50) {
    reasons.push("Language comfort overlaps well for Berlin-based dating.");
  }

  if (reasons.length === 0) {
    reasons.push("Structured preferences show enough overlap for an early conversation.");
  }

  return reasons.slice(0, 4);
}

function buildCautionSignals(candidate: Profile) {
  const lowSignal = detectLowSignalProfile(candidate).indicators;
  const intentNotes = detectIntentClarity(candidate).notes;
  const contradictions = detectProfileContradictions(candidate);

  return [...lowSignal, ...intentNotes, ...contradictions].slice(0, 4);
}

export function calculateCompatibility(user: Profile, candidate: Profile): MatchCandidate {
  const relationshipIntent = scoreRelationshipIntent(user, candidate);
  const communicationStyle = scoreCommunicationStyle(user, candidate);
  const sensoryFit = scoreSensoryFit(user, candidate);
  const pacingAndPlanning = scorePacingAndPlanning(user, candidate);
  const berlinLogistics = scoreBerlinLogistics(user, candidate);
  const profileSignal = scoreProfileSignal(candidate);

  // TODO: Calibrate weights against explicit match feedback, never retention or compulsive usage metrics.
  const compatibilityScore = Math.round(
    relationshipIntent * 0.24 +
      communicationStyle * 0.22 +
      sensoryFit * 0.18 +
      pacingAndPlanning * 0.14 +
      berlinLogistics * 0.1 +
      profileSignal * 0.12
  );

  return {
    userId: user.userId,
    candidateUserId: candidate.userId,
    compatibilityScore,
    dimensionScores: {
      relationshipIntent,
      communicationStyle,
      sensoryFit,
      pacingAndPlanning,
      berlinLogistics,
      profileSignal
    },
    reasons: buildReasons(user, candidate),
    cautionSignals: buildCautionSignals(candidate),
    profileSummary: buildProfileSummary(candidate),
    lastComputedAt: nowIso()
  };
}

export function getMatchCandidates(user: Profile, candidateProfiles: Profile[]) {
  return candidateProfiles
    .filter((candidate) => candidate.userId !== user.userId)
    .map((candidate) => calculateCompatibility(user, candidate))
    .sort((left, right) => right.compatibilityScore - left.compatibilityScore);
}
