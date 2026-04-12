import type {
  Profile,
  ProfileAnalysis,
  ProfileInput,
  User
} from "@clarity/shared";
import { nowIso } from "./ids.js";
import { buildProfileAnalysis, buildProfileSummary } from "../services/ai/profileSummary.js";

const requiredCompletenessChecks = [
  "identity",
  "diagnosisStatus",
  "communicationStyle",
  "socialEnergy",
  "routinePreference",
  "relationshipIntent",
  "sensoryProfile.noise",
  "sensoryProfile.crowd",
  "sensoryProfile.calm"
] as const;

function hasValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return value !== undefined && value !== null;
}

function readPath(profile: ProfileInput | Profile, path: string) {
  return path.split(".").reduce<unknown>((current, key) => {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, profile);
}

function identityPreferenceScore(profile: ProfileInput | Profile) {
  return profile.openTo.length > 0 ? 1 : 0;
}

export function calculateProfileCompleteness(profile: ProfileInput | Profile) {
  const optionalChecks = [
    hasValue(profile.age),
    hasValue(profile.locationLabel),
    hasValue(profile.bio),
    hasValue(profile.whatDrainsMe),
    hasValue(profile.whatINeedFromAPartner)
  ];

  const requiredHits = requiredCompletenessChecks.filter((path) => hasValue(readPath(profile, path))).length;
  const requiredScore = (requiredHits + identityPreferenceScore(profile)) / (requiredCompletenessChecks.length + 1);
  const optionalScore = optionalChecks.filter(Boolean).length / optionalChecks.length;

  return Number((requiredScore * 0.75 + optionalScore * 0.25).toFixed(2));
}

export function isOnboardingComplete(profile: ProfileInput | Profile) {
  return profile.openTo.length > 0 && requiredCompletenessChecks.every((path) => hasValue(readPath(profile, path)));
}

export function createDefaultProfile(user: User): Profile {
  const createdAt = nowIso();

  return {
    userId: user.id,
    displayName: user.firstName,
    city: user.city,
    openTo: ["adhd", "autism", "audhd"],
    sensoryProfile: {},
    profileCompleteness: 0,
    onboardingCompleted: false,
    summary: "Start onboarding to turn your preferences into a clearer profile.",
    profileSummary: {
      shortSummary: "Start onboarding to turn your preferences into a clearer profile.",
      communicationStyleNote: "Communication guidance will appear after onboarding is complete.",
      clarityLevel: "low",
      suggestion: "Add more detail to improve matches.",
      generatedAt: createdAt
    },
    createdAt,
    updatedAt: createdAt
  };
}

export function buildStoredProfile(user: User, input: ProfileInput, existing?: Profile): Profile {
  const baseProfile = existing ?? createDefaultProfile(user);
  const mergedProfile: Profile = {
    ...baseProfile,
    ...input,
    displayName: input.displayName.trim() || baseProfile.displayName,
    city: input.city.trim() || baseProfile.city,
    sensoryProfile: {
      ...baseProfile.sensoryProfile,
      ...input.sensoryProfile
    },
    openTo: input.openTo.length > 0 ? input.openTo : baseProfile.openTo,
    createdAt: existing?.createdAt ?? baseProfile.createdAt,
    updatedAt: nowIso(),
    profileCompleteness: 0,
    onboardingCompleted: false,
    summary: "",
    profileSummary: undefined
  };

  const profileCompleteness = calculateProfileCompleteness(mergedProfile);
  const profileSummary = buildProfileSummary({
    ...mergedProfile,
    profileCompleteness
  });

  return {
    ...mergedProfile,
    summary: profileSummary.shortSummary,
    profileSummary,
    profileCompleteness,
    onboardingCompleted: isOnboardingComplete(mergedProfile)
  };
}

export function buildProfilePayload(profile: Profile, exists: boolean) {
  const analysis: ProfileAnalysis = buildProfileAnalysis(profile);

  return {
    exists,
    profile,
    analysis
  };
}
