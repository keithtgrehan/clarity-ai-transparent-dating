import type {
  CommunicationAnalysisRequest,
  CommunicationAnalysisResponse,
  Conversation,
  ConversationListResponse,
  ConversationMessagesResponse,
  CreateConversationInput,
  CreateReportInput,
  CreateWaitlistLeadInput,
  MatchCandidateListResponse,
  Message,
  ProfileInput,
  ProfileResponse,
  Report,
  WaitlistLead
} from "@clarity/shared";
import { CommunicationAnalysisResponseSchema } from "@clarity/shared";

export type ApiErrorDetails = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
};

export class ApiError extends Error {
  status: number;
  details?: ApiErrorDetails;

  constructor(message: string, status: number, details?: ApiErrorDetails) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.PROD ? "/api" : "http://localhost:4000/api");

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });

  const contentType = response.headers.get("content-type") ?? "";
  const body =
    contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => null);

  if (!response.ok) {
    if (body && typeof body === "object") {
      const errorBody = body as { error?: string; details?: ApiErrorDetails };
      throw new ApiError(
        errorBody.error ?? `Request failed with status ${response.status}.`,
        response.status,
        errorBody.details
      );
    }

    throw new ApiError(`Request failed with status ${response.status}.`, response.status);
  }

  return body as T;
}

export async function fetchApiHealth() {
  return request<{ status: string; app: string; stage: string }>("/health");
}

export async function createWaitlistLead(input: CreateWaitlistLeadInput) {
  return request<{ lead: WaitlistLead }>("/waitlist/leads", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function fetchProfile(userId: string) {
  return request<ProfileResponse>(`/profiles/${userId}`);
}

export async function saveProfile(userId: string, profile: ProfileInput) {
  return request<ProfileResponse>(`/profiles/${userId}`, {
    method: "PUT",
    body: JSON.stringify(profile)
  });
}

export async function submitOnboarding(userId: string, profile: ProfileInput) {
  return request<ProfileResponse>("/onboarding", {
    method: "POST",
    body: JSON.stringify({ userId, profile })
  });
}

export async function fetchMatchCandidates(userId: string) {
  return request<MatchCandidateListResponse>(`/matches?userId=${userId}`);
}

export async function fetchConversations(userId: string) {
  return request<ConversationListResponse>(`/conversations?userId=${userId}`);
}

export async function fetchConversationMessages(conversationId: string) {
  return request<ConversationMessagesResponse>(`/conversations/${conversationId}/messages`);
}

export async function createConversation(input: CreateConversationInput) {
  return request<{ conversation: Conversation; reused: boolean }>("/conversations", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function sendMessage(input: {
  conversationId: string;
  senderUserId: string;
  body: string;
}) {
  return request<{ message: Message; moderationFlags: unknown[] }>("/messages", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function createReport(input: CreateReportInput) {
  return request<{ report: Report }>("/reports", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function analyzeSyntheticCommunicationFixture(
  input: CommunicationAnalysisRequest,
  signal?: AbortSignal
): Promise<CommunicationAnalysisResponse> {
  const response = await request<unknown>("/v2/communication-analysis/text", {
    method: "POST",
    cache: "no-store",
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal,
    body: JSON.stringify(input)
  });
  const parsed = CommunicationAnalysisResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError("Synthetic analysis returned an invalid response.", 502);
  }
  return parsed.data;
}
