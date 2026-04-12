import type { MatchCandidate, Profile } from "@clarity/shared";
import { humanizeEnum, joinNaturalLanguage } from "../lib/format.js";
import { buildProfileSummary } from "./ai/profileSummary.js";

const communicationOrder = ["indirect", "balanced", "direct"] as const;
const energyOrder = ["low", "medium", "high"] as const;
const routineOrder = ["routine", "balanced", "spontaneous"] as const;
const noiseOrder = ["low", "medium", "high"] as const;
const calmOrder = ["not_important", "helpful", "essential"] as const;

function scoreByDistance<T extends string>(
  left: T | undefined,
  right: T | undefined,
  scale: readonly T[]
) {
  if (!left || !right) {
    return 55;
  }

  const distance = Math.abs(scale.indexOf(left) - scale.indexOf(right));

  if (distance === 0) {
    return 100;
  }

  if (distance === 1) {
    return 76;
  }

  return 50;
}

function areIntentCompatible(left: Profile["relationshipIntent"], right: Profile["relationshipIntent"]) {
  if (!left || !right) {
    return false;
  }

  if (left === right) {
    return true;
  }

  const seriousIntentSet = new Set([
    "long_term_relationship",
    "life_partner",
    "dating_with_intent"
  ]);

  return seriousIntentSet.has(left) && seriousIntentSet.has(right);
}

function sameCity(left: Profile, right: Profile) {
  return left.city.trim().toLowerCase() === right.city.trim().toLowerCase();
}

function acceptsIdentity(profile: Profile, identity: Profile["identity"]) {
  if (!identity) {
    return false;
  }

  if (identity === "prefer_not_to_say") {
    return profile.openTo.includes("everyone");
  }

  return profile.openTo.includes("everyone") || profile.openTo.includes(identity);
}

export function areProfilesEligibleForMatching(user: Profile, candidate: Profile) {
  if (!user.onboardingCompleted || !candidate.onboardingCompleted) {
    return false;
  }

  if (!sameCity(user, candidate)) {
    return false;
  }

  if (!areIntentCompatible(user.relationshipIntent, candidate.relationshipIntent)) {
    return false;
  }

  return acceptsIdentity(user, candidate.identity) && acceptsIdentity(candidate, user.identity);
}

function scoreCommunication(user: Profile, candidate: Profile) {
  return scoreByDistance(user.communicationStyle, candidate.communicationStyle, communicationOrder);
}

function scoreEnergy(user: Profile, candidate: Profile) {
  return scoreByDistance(user.socialEnergy, candidate.socialEnergy, energyOrder);
}

function scoreSensory(user: Profile, candidate: Profile) {
  const noise = scoreByDistance(
    user.sensoryProfile.noise,
    candidate.sensoryProfile.noise,
    noiseOrder
  );
  const crowd = scoreByDistance(
    user.sensoryProfile.crowd,
    candidate.sensoryProfile.crowd,
    noiseOrder
  );
  const calm = scoreByDistance(user.sensoryProfile.calm, candidate.sensoryProfile.calm, calmOrder);

  return Math.round((noise + crowd + calm) / 3);
}

function scoreRoutine(user: Profile, candidate: Profile) {
  return scoreByDistance(user.routinePreference, candidate.routinePreference, routineOrder);
}

function sharedSignals(user: Profile, candidate: Profile) {
  const signals: string[] = [];

  if (user.identity && user.identity === candidate.identity) {
    signals.push(`Shared ${humanizeEnum(user.identity)} identity`);
  }

  if (user.communicationStyle && user.communicationStyle === candidate.communicationStyle) {
    signals.push(`${humanizeEnum(user.communicationStyle)} communication`);
  }

  if (user.socialEnergy && user.socialEnergy === candidate.socialEnergy) {
    signals.push(`${humanizeEnum(user.socialEnergy)} social energy`);
  }

  if (
    user.sensoryProfile.calm &&
    user.sensoryProfile.calm === candidate.sensoryProfile.calm
  ) {
    signals.push(`${humanizeEnum(user.sensoryProfile.calm)} calm`);
  }

  if (
    user.routinePreference &&
    user.routinePreference === candidate.routinePreference
  ) {
    signals.push(`${humanizeEnum(user.routinePreference)} planning`);
  }

  return signals.slice(0, 4);
}

function whyItCouldWork(user: Profile, candidate: Profile) {
  const reasons: string[] = [];

  if (user.relationshipIntent && user.relationshipIntent === candidate.relationshipIntent) {
    reasons.push("You want the same kind of relationship pace and direction.");
  } else {
    reasons.push("Your relationship goals sit in the same seriousness range.");
  }

  if (user.communicationStyle && user.communicationStyle === candidate.communicationStyle) {
    reasons.push(`You both prefer ${humanizeEnum(user.communicationStyle)} communication.`);
  }

  if (
    user.sensoryProfile.calm &&
    user.sensoryProfile.calm === candidate.sensoryProfile.calm
  ) {
    reasons.push("Your sensory needs point toward a similarly calm date setup.");
  }

  if (
    user.routinePreference &&
    user.routinePreference === candidate.routinePreference &&
    reasons.length < 3
  ) {
    reasons.push("Your planning styles line up well for early dating.");
  }

  if (reasons.length === 0) {
    reasons.push("Your structured preferences are compatible enough for a clear first conversation.");
  }

  return reasons.slice(0, 3);
}

function potentialFriction(user: Profile, candidate: Profile) {
  const friction: string[] = [];

  if (
    user.communicationStyle &&
    candidate.communicationStyle &&
    scoreCommunication(user, candidate) < 70
  ) {
    friction.push("Your communication styles may need more explicit check-ins.");
  }

  if (user.socialEnergy && candidate.socialEnergy && scoreEnergy(user, candidate) < 70) {
    friction.push("Your ideal social pace could differ once plans get busier.");
  }

  if (user.routinePreference && candidate.routinePreference && scoreRoutine(user, candidate) < 70) {
    friction.push("One of you may want more structure around planning than the other.");
  }

  if (friction.length === 0 && scoreSensory(user, candidate) < 70) {
    friction.push("Date setup may need care so both of your sensory needs stay comfortable.");
  }

  return friction.slice(0, 2);
}

function confidenceFor(user: Profile, candidate: Profile) {
  const averageCompleteness = (user.profileCompleteness + candidate.profileCompleteness) / 2;

  if (averageCompleteness >= 0.85) {
    return "high" as const;
  }

  if (averageCompleteness >= 0.6) {
    return "medium" as const;
  }

  return "low" as const;
}

function firstMessagePrompt(candidate: Profile, signals: string[]) {
  const signalText =
    signals.length > 0
      ? `You already share ${joinNaturalLanguage(signals)}.`
      : "You already have some structured overlap.";

  return `${signalText} Try asking ${candidate.displayName} what would make a first date feel easy for them.`;
}

function sortScore(user: Profile, candidate: Profile) {
  const communication = scoreCommunication(user, candidate);
  const energy = scoreEnergy(user, candidate);
  const sensory = scoreSensory(user, candidate);
  const routine = scoreRoutine(user, candidate);

  return communication * 0.3 + energy * 0.2 + sensory * 0.3 + routine * 0.2;
}

export function calculateCompatibility(user: Profile, candidate: Profile): MatchCandidate {
  const signals = sharedSignals(user, candidate);
  const summary = candidate.profileSummary ?? buildProfileSummary(candidate);

  return {
    candidateUserId: candidate.userId,
    profile: {
      userId: candidate.userId,
      displayName: candidate.displayName,
      age: candidate.age,
      city: candidate.city,
      locationLabel: candidate.locationLabel,
      identity: candidate.identity,
      diagnosisStatus: candidate.diagnosisStatus,
      communicationStyle: candidate.communicationStyle,
      socialEnergy: candidate.socialEnergy,
      sensoryProfile: candidate.sensoryProfile,
      routinePreference: candidate.routinePreference,
      relationshipIntent: candidate.relationshipIntent,
      summary: candidate.summary?.trim() || summary.shortSummary,
      profileSummary: summary,
      profileCompleteness: candidate.profileCompleteness
    },
    whyItCouldWork: whyItCouldWork(user, candidate),
    potentialFriction: potentialFriction(user, candidate),
    confidence: confidenceFor(user, candidate),
    sharedSignals: signals,
    firstMessagePrompt: firstMessagePrompt(candidate, signals)
  };
}

export function getMatchCandidates(user: Profile, candidateProfiles: Profile[]) {
  return candidateProfiles
    .filter((candidate) => candidate.userId !== user.userId)
    .filter((candidate) => areProfilesEligibleForMatching(user, candidate))
    .map((candidate) => ({
      candidate: calculateCompatibility(user, candidate),
      sortScore: sortScore(user, candidate)
    }))
    .sort((left, right) => right.sortScore - left.sortScore)
    .map((entry) => entry.candidate);
}
