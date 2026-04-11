import type { z } from "zod";
import {
  ConversationListItemSchema,
  LocalDataStoreSchema,
  MatchCandidateSchema,
  MessageSchema,
  ModerationFlagSchema,
  ProfileAnalysisSchema,
  ProfileSchema,
  ReportSchema,
  UserSchema,
  WaitlistLeadSchema
} from "../schemas/domain.js";
import {
  ConversationMessagesResponseSchema,
  ConversationListResponseSchema,
  CreateConversationInputSchema,
  CreateReportInputSchema,
  CreateWaitlistLeadInputSchema,
  MatchCandidateListResponseSchema,
  ProfileInputSchema,
  ProfileResponseSchema,
  SendMessageInputSchema,
  SubmitOnboardingInputSchema,
  UpsertProfileInputSchema
} from "../schemas/contracts.js";

export type User = z.infer<typeof UserSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type MatchCandidate = z.infer<typeof MatchCandidateSchema>;
export type ProfileAnalysis = z.infer<typeof ProfileAnalysisSchema>;
export type Conversation = z.infer<typeof ConversationListItemSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type ModerationFlag = z.infer<typeof ModerationFlagSchema>;
export type Report = z.infer<typeof ReportSchema>;
export type WaitlistLead = z.infer<typeof WaitlistLeadSchema>;
export type LocalDataStore = z.infer<typeof LocalDataStoreSchema>;

export type CreateWaitlistLeadInput = z.infer<typeof CreateWaitlistLeadInputSchema>;
export type ProfileInput = z.infer<typeof ProfileInputSchema>;
export type UpsertProfileInput = z.infer<typeof UpsertProfileInputSchema>;
export type SubmitOnboardingInput = z.infer<typeof SubmitOnboardingInputSchema>;
export type CreateConversationInput = z.infer<typeof CreateConversationInputSchema>;
export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;
export type CreateReportInput = z.infer<typeof CreateReportInputSchema>;
export type ProfileResponse = z.infer<typeof ProfileResponseSchema>;
export type MatchCandidateListResponse = z.infer<typeof MatchCandidateListResponseSchema>;
export type ConversationListResponse = z.infer<typeof ConversationListResponseSchema>;
export type ConversationMessagesResponse = z.infer<typeof ConversationMessagesResponseSchema>;
