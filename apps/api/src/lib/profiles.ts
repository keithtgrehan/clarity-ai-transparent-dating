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

export function calculateProfileCompleteness(profile: ProfileInput | Profile) {
  const optionalChecks = [
    hasValue(profile.age),
    hasValue(profile.locationLabel),
    hasValue(profile.bio),
    hasValue(profile.whatDrainsMe),
    hasValue(profile.whatINeedFromAPartner),
    profile.openTo.length > 0
  ];

  const requiredScore =
    requiredCompletenessChecks.filter((path) => hasValue(readPath(profile, path))).length /
    requiredCompletenessChecks.length;
  const optionalScore = optionalChecks.filter(Boolean).length / optionalChecks.length;

  return Number((requiredScore * 0.75 + optionalScore * 0.25).toFixed(2));
}

export function isOnboardingComplete(profile: ProfileInput | Profile) {
  return requiredCompletenessChecks.every((path) => hasValue(readPath(profile, path)));
}

export function createDefaultProfile(user: User): Profile {
  const createdAt = nowIso();

  return {
    userId: user.id,
    displayName: user.firstName,
    city: user.city,
    openTo: ["everyone"],
    sensoryProfile: {},
    profileCompleteness: 0,
    onboardingCompleted: false,
    summary: "Start onboarding to turn your preferences into a clearer profile.",
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
    summary: ""
  };

  const profileCompleteness = calculateProfileCompleteness(mergedProfile);
  const summary = buildProfileSummary(mergedProfile);

  return {
    ...mergedProfile,
    summary,
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
