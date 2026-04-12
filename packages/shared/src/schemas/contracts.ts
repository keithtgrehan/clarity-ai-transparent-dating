import { z } from "zod";
import {
  ConversationListItemSchema,
  MatchCandidateSchema,
  MessageSchema,
  ProfileAnalysisSchema,
  ProfileSchema,
  ReportSchema,
  WaitlistLeadSchema
} from "./domain.js";

export const ProfileInputSchema = ProfileSchema.omit({
  userId: true,
  summary: true,
  profileSummary: true,
  profileCompleteness: true,
  onboardingCompleted: true,
  createdAt: true,
  updatedAt: true
});

function requireOnboardingField<T>(
  value: T | undefined,
  path: Array<string | number>,
  message: string,
  context: z.RefinementCtx
) {
  if (value === undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message,
      path
    });
  }
}

export const OnboardingProfileInputSchema = ProfileInputSchema.superRefine((profile, context) => {
  requireOnboardingField(
    profile.identity,
    ["identity"],
    "Choose whether you identify as ADHD, Autism, AuDHD, or another supported option.",
    context
  );

  if (profile.openTo.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Choose at least one identity group to match with.",
      path: ["openTo"]
    });
  }

  requireOnboardingField(
    profile.diagnosisStatus,
    ["diagnosisStatus"],
    "Choose a diagnosis status.",
    context
  );
  requireOnboardingField(
    profile.communicationStyle,
    ["communicationStyle"],
    "Choose a communication style.",
    context
  );
  requireOnboardingField(
    profile.socialEnergy,
    ["socialEnergy"],
    "Choose a social energy level.",
    context
  );
  requireOnboardingField(
    profile.sensoryProfile.noise,
    ["sensoryProfile", "noise"],
    "Choose a noise preference.",
    context
  );
  requireOnboardingField(
    profile.sensoryProfile.crowd,
    ["sensoryProfile", "crowd"],
    "Choose a crowd preference.",
    context
  );
  requireOnboardingField(
    profile.sensoryProfile.calm,
    ["sensoryProfile", "calm"],
    "Choose how much calm matters.",
    context
  );
  requireOnboardingField(
    profile.routinePreference,
    ["routinePreference"],
    "Choose a routine preference.",
    context
  );
  requireOnboardingField(
    profile.relationshipIntent,
    ["relationshipIntent"],
    "Choose a relationship intent.",
    context
  );
});

export const CreateWaitlistLeadInputSchema = WaitlistLeadSchema.omit({
  id: true,
  createdAt: true
});

export const UpsertProfileInputSchema = ProfileInputSchema;

export const SubmitOnboardingInputSchema = z.object({
  userId: z.string().min(1),
  profile: OnboardingProfileInputSchema
});

export const CreateConversationInputSchema = z.object({
  participantUserIds: z.array(z.string().min(1)).length(2)
});

export const SendMessageInputSchema = z.object({
  conversationId: z.string().min(1),
  senderUserId: z.string().min(1),
  body: z.string().trim().min(1).max(2000)
});

export const CreateReportInputSchema = ReportSchema.omit({
  id: true,
  createdAt: true,
  status: true
});

export const ProfileResponseSchema = z.object({
  exists: z.boolean(),
  profile: ProfileSchema,
  analysis: ProfileAnalysisSchema
});

export const MatchCandidateListResponseSchema = z.object({
  userId: z.string().min(1),
  candidates: z.array(MatchCandidateSchema)
});

export const ConversationListResponseSchema = z.object({
  userId: z.string().min(1),
  conversations: z.array(ConversationListItemSchema)
});

export const ConversationMessagesResponseSchema = z.object({
  conversation: ConversationListItemSchema,
  messages: z.array(MessageSchema),
  firstMessagePrompt: z.string().trim().min(1).max(200).optional()
});
