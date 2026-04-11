import { z } from "zod";
import {
  moderationCategories,
  moderationSeverityLevels,
  moderationStatuses
} from "../constants/moderation.js";

const TimestampSchema = z.string().min(1);
const IdSchema = z.string().min(1);
const ShortTextSchema = z.string().trim().min(1).max(140);

export const AccountStatusSchema = z.enum(["invited", "active", "blocked"]);

export const IdentitySchema = z.enum([
  "woman",
  "man",
  "nonbinary",
  "trans",
  "queer",
  "self_described",
  "prefer_not_to_say"
]);

export const IdentityPreferenceSchema = z.enum([
  "woman",
  "man",
  "nonbinary",
  "trans",
  "queer",
  "self_described",
  "everyone"
]);

export const DiagnosisStatusSchema = z.enum([
  "diagnosed",
  "self_identify",
  "prefer_not_to_say",
  "not_applicable"
]);

export const CommunicationStyleSchema = z.enum(["direct", "balanced", "indirect"]);
export const SocialEnergySchema = z.enum(["low", "medium", "high"]);
export const ToleranceSchema = z.enum(["low", "medium", "high"]);
export const CalmNeedSchema = z.enum(["essential", "helpful", "not_important"]);
export const RoutinePreferenceSchema = z.enum(["routine", "balanced", "spontaneous"]);
export const RelationshipIntentSchema = z.enum([
  "long_term_relationship",
  "life_partner",
  "dating_with_intent",
  "exploring_with_clarity",
  "friendship_first"
]);
export const MatchConfidenceSchema = z.enum(["high", "medium", "low"]);

export const SensoryProfileSchema = z.object({
  noise: ToleranceSchema.optional(),
  crowd: ToleranceSchema.optional(),
  calm: CalmNeedSchema.optional()
});

export const UserSchema = z.object({
  id: IdSchema,
  firstName: z.string().trim().min(1).max(60),
  city: z.string().trim().min(1).max(80),
  accountStatus: AccountStatusSchema,
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema
});

export const ProfileSchema = z.object({
  userId: IdSchema,
  displayName: z.string().trim().min(1).max(60),
  age: z.number().int().min(18).max(80).optional(),
  city: z.string().trim().min(1).max(80),
  locationLabel: z.string().trim().max(120).optional(),
  identity: IdentitySchema.optional(),
  identityLabel: z.string().trim().max(60).optional(),
  openTo: z.array(IdentityPreferenceSchema).min(1).max(6).default(["everyone"]),
  diagnosisStatus: DiagnosisStatusSchema.optional(),
  diagnosisLabel: z.string().trim().max(80).optional(),
  communicationStyle: CommunicationStyleSchema.optional(),
  socialEnergy: SocialEnergySchema.optional(),
  sensoryProfile: SensoryProfileSchema.default({}),
  routinePreference: RoutinePreferenceSchema.optional(),
  relationshipIntent: RelationshipIntentSchema.optional(),
  bio: z.string().trim().max(600).optional(),
  whatDrainsMe: z.string().trim().max(280).optional(),
  whatINeedFromAPartner: z.string().trim().max(280).optional(),
  summary: z.string().trim().max(180).optional(),
  profileCompleteness: z.number().min(0).max(1),
  onboardingCompleted: z.boolean(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema
});

export const ProfileAnalysisSchema = z.object({
  summary: z.string().trim().min(1).max(180),
  lowSignalIndicators: z.array(ShortTextSchema).max(4),
  improvementSuggestions: z.array(ShortTextSchema).max(4),
  contradictionHints: z.array(ShortTextSchema).max(3),
  generatedAt: TimestampSchema
});

export const MatchProfileSchema = z.object({
  userId: IdSchema,
  displayName: z.string().trim().min(1).max(60),
  age: z.number().int().min(18).max(80).optional(),
  city: z.string().trim().min(1).max(80),
  locationLabel: z.string().trim().max(120).optional(),
  identity: IdentitySchema.optional(),
  diagnosisStatus: DiagnosisStatusSchema.optional(),
  communicationStyle: CommunicationStyleSchema.optional(),
  socialEnergy: SocialEnergySchema.optional(),
  sensoryProfile: SensoryProfileSchema,
  routinePreference: RoutinePreferenceSchema.optional(),
  relationshipIntent: RelationshipIntentSchema.optional(),
  summary: z.string().trim().min(1).max(180),
  profileCompleteness: z.number().min(0).max(1)
});

export const MatchCandidateSchema = z.object({
  candidateUserId: IdSchema,
  profile: MatchProfileSchema,
  whyItCouldWork: z.array(ShortTextSchema).min(1).max(3),
  potentialFriction: z.array(ShortTextSchema).max(2),
  confidence: MatchConfidenceSchema,
  sharedSignals: z.array(z.string().trim().min(1).max(60)).max(4),
  firstMessagePrompt: z.string().trim().min(1).max(200).optional()
});

export const ConversationParticipantSchema = z.object({
  userId: IdSchema,
  displayName: z.string().trim().min(1).max(60)
});

export const ConversationSchema = z.object({
  id: IdSchema,
  participantUserIds: z.array(IdSchema).length(2),
  status: z.enum(["active", "blocked", "archived"]),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  lastMessagePreview: z.string().trim().max(180).optional()
});

export const ConversationListItemSchema = ConversationSchema.extend({
  participants: z.array(ConversationParticipantSchema).length(2)
});

export const MessageSchema = z.object({
  id: IdSchema,
  conversationId: IdSchema,
  senderUserId: IdSchema,
  body: z.string().trim().min(1).max(2000),
  sentAt: TimestampSchema,
  moderationState: z.enum(["clear", "review", "held"]).default("clear")
});

export const ModerationFlagSchema = z.object({
  id: IdSchema,
  targetType: z.enum(["profile", "message", "conversation", "user"]),
  targetId: IdSchema,
  category: z.enum(moderationCategories),
  severity: z.enum(moderationSeverityLevels),
  status: z.enum(moderationStatuses),
  source: z.enum(["user_report", "pattern_match", "manual_review"]),
  evidenceSnippet: z.string().trim().max(240).optional(),
  notes: z.string().trim().max(500).optional(),
  createdAt: TimestampSchema
});

export const ReportSchema = z.object({
  id: IdSchema,
  reporterUserId: IdSchema,
  targetUserId: IdSchema,
  conversationId: IdSchema.optional(),
  messageId: IdSchema.optional(),
  categories: z.array(z.enum(moderationCategories)).min(1).max(4),
  description: z.string().trim().min(12).max(1200),
  blockUser: z.boolean().default(true),
  status: z.enum(["submitted", "in_review", "resolved", "dismissed"]),
  createdAt: TimestampSchema
});

export const WaitlistLeadSchema = z.object({
  id: IdSchema,
  firstName: z.string().trim().min(1).max(60),
  email: z.string().email(),
  city: z.string().trim().min(1).max(80),
  relationshipIntent: RelationshipIntentSchema.optional(),
  communicationStyle: CommunicationStyleSchema.optional(),
  note: z.string().trim().max(400).optional(),
  createdAt: TimestampSchema
});

export const LocalDataStoreSchema = z.object({
  users: z.array(UserSchema),
  profiles: z.array(ProfileSchema),
  conversations: z.array(ConversationSchema),
  messages: z.array(MessageSchema),
  reports: z.array(ReportSchema),
  waitlistLeads: z.array(WaitlistLeadSchema),
  moderationFlags: z.array(ModerationFlagSchema)
});
