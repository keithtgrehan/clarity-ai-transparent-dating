import type {
  Conversation,
  ConversationListResponse,
  CreateConversationInput,
  CreateReportBlockInput,
  CreateWaitlistLeadInput,
  MatchCandidateListResponse,
  Message,
  Profile,
  Report,
  WaitlistLead
} from "@project-a-z/shared";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error ?? "Request failed.");
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
  return request<{ profile: Profile }>(`/profiles/${userId}`);
}

export async function saveProfile(userId: string, profile: Profile) {
  return request<{ profile: Profile }>(`/profiles/${userId}`, {
    method: "PUT",
    body: JSON.stringify(profile)
  });
}

export async function submitOnboarding(userId: string, profile: Profile) {
  return request<{ ok: boolean; profile: Profile }>("/onboarding/submit", {
    method: "POST",
    body: JSON.stringify({ userId, profile })
  });
}

export async function fetchMatchCandidates(userId: string) {
  return request<MatchCandidateListResponse>(`/matches/candidates?userId=${userId}`);
}

export async function fetchConversations(userId: string) {
  return request<ConversationListResponse>(`/conversations?userId=${userId}`);
}

export async function fetchConversationMessages(conversationId: string) {
  return request<{ conversation: Conversation; messages: Message[] }>(
    `/conversations/${conversationId}/messages`
  );
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

export async function createReport(input: CreateReportBlockInput) {
  return request<{ report: Report }>("/safety/report-block", {
    method: "POST",
    body: JSON.stringify(input)
  });
}
