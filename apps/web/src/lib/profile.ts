import type { MatchCandidate, Profile, ProfileInput } from "@clarity/shared";

const enumLabels: Record<string, string> = {
  adhd: "ADHD",
  audhd: "AuDHD",
  autism: "Autism",
  neurotypical_ally: "Neurotypical ally",
  prefer_not_to_say: "Prefer not to say"
};

export const viewerUserId = "user-you";

export const identityOptions = [
  { value: "adhd", label: "ADHD" },
  { value: "autism", label: "Autism" },
  { value: "audhd", label: "AuDHD" },
  { value: "neurotypical_ally", label: "Neurotypical ally" },
  { value: "prefer_not_to_say", label: "Prefer not to say" }
] as const;

export const openToOptions = [
  { value: "adhd", label: "ADHD" },
  { value: "autism", label: "Autism" },
  { value: "audhd", label: "AuDHD" },
  { value: "neurotypical_ally", label: "Neurotypical ally" },
  { value: "everyone", label: "Everyone" }
] as const;

export const diagnosisOptions = [
  { value: "diagnosed", label: "Diagnosed" },
  { value: "self_identified", label: "Self-identified" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
  { value: "not_applicable", label: "Not applicable" }
] as const;

export const communicationOptions = [
  { value: "direct", label: "Direct", help: "Say it clearly and early." },
  { value: "balanced", label: "Balanced", help: "Clear, but with some softness and context." },
  { value: "indirect", label: "Gentle", help: "Gentler phrasing helps you ease into things." }
] as const;

export const socialEnergyOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" }
] as const;

export const toleranceOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" }
] as const;

export const calmNeedOptions = [
  { value: "essential", label: "Essential" },
  { value: "helpful", label: "Helpful" },
  { value: "not_important", label: "Not important" }
] as const;

export const routineOptions = [
  { value: "routine", label: "Routine" },
  { value: "balanced", label: "Balanced" },
  { value: "spontaneous", label: "Spontaneous" }
] as const;

export const relationshipIntentOptions = [
  { value: "long_term_relationship", label: "Long-term relationship" },
  { value: "life_partner", label: "Life partner" },
  { value: "dating_with_intent", label: "Dating with intent" },
  { value: "exploring_with_clarity", label: "Exploring with clarity" },
  { value: "friendship_first", label: "Friendship first" }
] as const;

export const reportCategories = [
  { value: "harassment", label: "Harassment" },
  { value: "sexual_pressure", label: "Sexual pressure" },
  { value: "fetishisation", label: "Fetishisation" },
  { value: "other", label: "Other" }
] as const;

export function humanizeEnum(value?: string) {
  if (!value) {
    return "Not set";
  }

  if (enumLabels[value]) {
    return enumLabels[value];
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (part) => part.toUpperCase());
}

export function profileToInput(profile: Profile): ProfileInput {
  const {
    userId: _userId,
    summary: _summary,
    profileSummary: _profileSummary,
    profileCompleteness: _profileCompleteness,
    onboardingCompleted: _onboardingCompleted,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...input
  } = profile;

  return input;
}

export function toggleArrayValue<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

export function completenessLabel(value: number) {
  return `${Math.round(value * 100)}% complete`;
}

export function candidateName(candidate: MatchCandidate) {
  return candidate.profile.displayName;
}
