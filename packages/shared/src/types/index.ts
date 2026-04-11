import type { z } from "zod";
import {
  CommunicationPreferencesSchema,
  ConversationSchema,
  LocalDataStoreSchema,
  MatchCandidateSchema,
  MessageSchema,
  ModerationFlagSchema,
  ProfileSchema,
  ProfileSummarySchema,
  RelationshipIntentSchema,
  ReportSchema,
  SensoryPreferencesSchema,
  UserSchema,
  WaitlistLeadSchema
} from "../schemas/domain.js";
import {
  ConversationListResponseSchema,
  CreateConversationInputSchema,
  CreateReportBlockInputSchema,
  CreateWaitlistLeadInputSchema,
  MatchCandidateListResponseSchema,
  SendMessageInputSchema,
  SubmitOnboardingInputSchema,
  UpsertProfileInputSchema
} from "../schemas/contracts.js";

export type User = z.infer<typeof UserSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type CommunicationPreferences = z.infer<typeof CommunicationPreferencesSchema>;
export type SensoryPreferences = z.infer<typeof SensoryPreferencesSchema>;
export type RelationshipIntent = z.infer<typeof RelationshipIntentSchema>;
export type MatchCandidate = z.infer<typeof MatchCandidateSchema>;
export type ProfileSummary = z.infer<typeof ProfileSummarySchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type ModerationFlag = z.infer<typeof ModerationFlagSchema>;
export type Report = z.infer<typeof ReportSchema>;
export type WaitlistLead = z.infer<typeof WaitlistLeadSchema>;
export type LocalDataStore = z.infer<typeof LocalDataStoreSchema>;

export type CreateWaitlistLeadInput = z.infer<typeof CreateWaitlistLeadInputSchema>;
export type UpsertProfileInput = z.infer<typeof UpsertProfileInputSchema>;
export type SubmitOnboardingInput = z.infer<typeof SubmitOnboardingInputSchema>;
export type CreateConversationInput = z.infer<typeof CreateConversationInputSchema>;
export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;
export type CreateReportBlockInput = z.infer<typeof CreateReportBlockInputSchema>;
export type MatchCandidateListResponse = z.infer<typeof MatchCandidateListResponseSchema>;
export type ConversationListResponse = z.infer<typeof ConversationListResponseSchema>;
