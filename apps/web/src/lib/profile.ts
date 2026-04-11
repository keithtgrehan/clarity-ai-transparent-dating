import type { MatchCandidate, Profile, ProfileInput } from "@clarity/shared";

export const viewerUserId = "user-you";

export const candidateUsers = [
  { id: "user-jonas", label: "Jonas" },
  { id: "user-merve", label: "Merve" },
  { id: "user-sam", label: "Sam" }
] as const;

export const identityOptions = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "nonbinary", label: "Nonbinary" },
  { value: "trans", label: "Trans" },
  { value: "queer", label: "Queer" },
  { value: "self_described", label: "Self-described" },
  { value: "prefer_not_to_say", label: "Prefer not to say" }
] as const;

export const openToOptions = [
  { value: "everyone", label: "Everyone" },
  { value: "woman", label: "Women" },
  { value: "man", label: "Men" },
  { value: "nonbinary", label: "Nonbinary people" },
  { value: "trans", label: "Trans people" },
  { value: "queer", label: "Queer people" },
  { value: "self_described", label: "Self-described identities" }
] as const;

export const diagnosisOptions = [
  { value: "diagnosed", label: "Diagnosed" },
  { value: "self_identify", label: "Self-identify" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
  { value: "not_applicable", label: "Not applicable" }
] as const;

export const communicationOptions = [
  { value: "direct", label: "Direct", help: "Say it clearly and early." },
  { value: "balanced", label: "Balanced", help: "Clear, but with some softness and context." },
  { value: "indirect", label: "Indirect", help: "Gentler phrasing helps you ease into things." }
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

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (part) => part.toUpperCase());
}

export function profileToInput(profile: Profile): ProfileInput {
  const {
    summary: _summary,
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
