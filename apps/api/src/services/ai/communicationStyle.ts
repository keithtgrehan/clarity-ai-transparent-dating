import type { Profile } from "@clarity/shared";
import { humanizeEnum } from "../../lib/format.js";

export function extractProfileTags(profile: Profile) {
  const tags: string[] = [];

  if (profile.communicationStyle) {
    tags.push(`${humanizeEnum(profile.communicationStyle)} communication`);
  }

  if (profile.socialEnergy) {
    tags.push(`${humanizeEnum(profile.socialEnergy)} social energy`);
  }

  if (profile.routinePreference) {
    tags.push(`${humanizeEnum(profile.routinePreference)} routine`);
  }

  if (profile.relationshipIntent) {
    tags.push(humanizeEnum(profile.relationshipIntent));
  }

  if (profile.sensoryProfile.calm) {
    tags.push(`${humanizeEnum(profile.sensoryProfile.calm)} calm`);
  }

  return tags.slice(0, 5);
}
