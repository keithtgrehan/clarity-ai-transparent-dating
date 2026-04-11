import { z } from "zod";
import {
  moderationCategories,
  moderationSeverityLevels,
  moderationStatuses
} from "../constants/moderation.js";

const TimestampSchema = z.string().min(1);
const IdSchema = z.string().min(1);

export const NeurotypeSchema = z.enum([
  "adhd",
  "autism",
  "audhd",
  "anxiety_secondary",
  "depression_secondary",
  "neurotypical",
  "undisclosed"
]);

export const RelationshipIntentSchema = z.object({
  primary: z.enum([
    "long_term_relationship",
    "life_partner",
    "dating_with_intent",
    "exploring_with_clarity",
    "short_term_connection"
  ]),
  pacing: z.enum(["slow_and_intentional", "steady", "flexible"]),
  openness: z
    .array(z.enum(["monogamous", "non_monogamous", "not_sure_yet"]))
    .min(1)
    .max(3),
  notes: z.string().trim().max(280).optional()
});

export const CommunicationPreferencesSchema = z.object({
  responseCadence: z.enum(["same_day", "within_two_days", "variable"]),
  planningStyle: z.enum(["scheduled", "semi_spontaneous", "spontaneous"]),
  directness: z.enum(["very_direct", "direct_with_context", "mixed"]),
  messageLength: z.enum(["short", "medium", "long"]),
  callPreference: z.enum(["avoid_calls", "scheduled_calls_only", "open_to_calls"]),
  initiationPreference: z.enum(["explicit", "gentle", "balanced"]),
  repairStyle: z.enum(["name_it_directly", "need_processing_time", "context_then_repair"]),
  notes: z.string().trim().max(280).optional()
});

export const SensoryPreferencesSchema = z.object({
  dateEnvironments: z
    .array(
      z.enum([
        "quiet_cafe",
        "park_walk",
        "museum_or_gallery",
        "structured_activity",
        "video_call_first",
        "home_cooking_later"
      ])
    )
    .min(1)
    .max(4),
  noiseTolerance: z.enum(["low", "medium", "high"]),
  crowdTolerance: z.enum(["low", "medium", "high"]),
  lightingPreference: z.enum(["soft", "bright", "outdoor"]),
  touchPace: z.enum(["ask_first", "slow_build", "context_dependent"]),
  decompressionNeeds: z.string().trim().max(240).optional(),
  notes: z.string().trim().max(280).optional()
});

export const UserSchema = z.object({
  id: IdSchema,
  email: z.string().email(),
  firstName: z.string().trim().min(1).max(60),
  city: z.string().trim().min(1).max(80),
  neighborhoods: z.array(z.string().trim().min(1).max(80)).max(4).default([]),
  languages: z.array(z.string().trim().min(1).max(40)).min(1).max(4),
  neurotypeContexts: z.array(NeurotypeSchema).min(1).max(4),
  accountStatus: z.enum(["waitlist", "active", "paused", "blocked"]),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema
});

export const ProfileSchema = z.object({
  userId: IdSchema,
  displayName: z.string().trim().min(1).max(60),
  age: z.number().int().min(18).max(80),
  pronouns: z.string().trim().max(40).optional(),
  tagline: z.string().trim().max(120),
  bio: z.string().trim().min(24).max(800),
  whatHelpsMeCommunicate: z.string().trim().min(24).max(500),
  idealFirstDate: z.string().trim().min(12).max(280),
  relationshipIntent: RelationshipIntentSchema,
  communicationPreferences: CommunicationPreferencesSchema,
  sensoryPreferences: SensoryPreferencesSchema,
  interests: z.array(z.string().trim().min(1).max(40)).min(2).max(8),
  languages: z.array(z.string().trim().min(1).max(40)).min(1).max(4),
  berlinAreas: z.array(z.string().trim().min(1).max(80)).min(1).max(5),
  neurotypeVisibility: z.enum(["show", "share_after_match", "private"]),
  neurotypeMatchPreference: z.enum(["nd_only", "prefer_nd", "open_later"]),
  profileCompleteness: z.number().min(0).max(1),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema
});

export const ProfileSummarySchema = z.object({
  userId: IdSchema,
  headline: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(280),
  communicationTags: z.array(z.string().trim().min(1).max(40)).max(6),
  lowSignalIndicators: z.array(z.string().trim().min(1).max(80)).max(6),
  cautionNotes: z.array(z.string().trim().min(1).max(120)).max(4),
  generatedAt: TimestampSchema,
  editableByUser: z.boolean().default(true)
});

export const MatchCandidateSchema = z.object({
  userId: IdSchema,
  candidateUserId: IdSchema,
  compatibilityScore: z.number().min(0).max(100),
  dimensionScores: z.object({
    relationshipIntent: z.number().min(0).max(100),
    communicationStyle: z.number().min(0).max(100),
    sensoryFit: z.number().min(0).max(100),
    pacingAndPlanning: z.number().min(0).max(100),
    berlinLogistics: z.number().min(0).max(100),
    profileSignal: z.number().min(0).max(100)
  }),
  reasons: z.array(z.string().trim().min(1).max(120)).min(1).max(4),
  cautionSignals: z.array(z.string().trim().min(1).max(120)).max(4),
  profileSummary: ProfileSummarySchema,
  lastComputedAt: TimestampSchema
});

export const ConversationSchema = z.object({
  id: IdSchema,
  participantUserIds: z.array(IdSchema).length(2),
  status: z.enum(["active", "blocked", "archived"]),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  lastMessagePreview: z.string().trim().max(180).optional()
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
  source: z.enum(["user_report", "ai_assist", "manual_review"]),
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
  email: z.string().email(),
  firstName: z.string().trim().min(1).max(60),
  city: z.string().trim().min(1).max(80),
  neighborhood: z.string().trim().min(1).max(80),
  languages: z.array(z.string().trim().min(1).max(40)).min(1).max(4),
  neurotypeContexts: z.array(NeurotypeSchema).min(1).max(4),
  relationshipIntent: RelationshipIntentSchema,
  communicationNeeds: z.string().trim().min(12).max(320),
  source: z.string().trim().min(1).max(120),
  interviewOptIn: z.boolean(),
  pilotOptIn: z.boolean(),
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
