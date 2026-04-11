import { z } from "zod";
import {
  ConversationSchema,
  MatchCandidateSchema,
  ProfileSchema,
  ReportSchema,
  WaitlistLeadSchema
} from "./domain.js";

export const CreateWaitlistLeadInputSchema = WaitlistLeadSchema.omit({
  id: true,
  createdAt: true
});

export const UpsertProfileInputSchema = ProfileSchema;

export const SubmitOnboardingInputSchema = z.object({
  userId: z.string().min(1),
  profile: ProfileSchema
});

export const CreateConversationInputSchema = z.object({
  participantUserIds: z.array(z.string().min(1)).length(2)
});

export const SendMessageInputSchema = z.object({
  conversationId: z.string().min(1),
  senderUserId: z.string().min(1),
  body: z.string().trim().min(1).max(2000)
});

export const CreateReportBlockInputSchema = ReportSchema.omit({
  id: true,
  createdAt: true,
  status: true
});

export const MatchCandidateListResponseSchema = z.object({
  userId: z.string().min(1),
  candidates: z.array(MatchCandidateSchema)
});

export const ConversationListResponseSchema = z.object({
  userId: z.string().min(1),
  conversations: z.array(ConversationSchema)
});
