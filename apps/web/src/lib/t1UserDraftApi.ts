import type {
  T1UserDraftAnalysisResponse,
  T1UserDraftClearRequest,
  T1UserDraftContinueRequest,
  T1UserDraftPrepareRequest,
  T1UserDraftPrepareResponse
} from "@clarity/shared";
import {
  T1UserDraftAnalysisResponseSchema,
  T1UserDraftPrepareResponseSchema
} from "@clarity/shared";

const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL ??
  (import.meta.env?.PROD ? "/api" : "http://localhost:4000/api");

class T1UserDraftApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "T1UserDraftApiError";
    this.status = status;
  }
}

async function requestT1(path: string, init: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    credentials: "include",
    referrerPolicy: "no-referrer",
    ...init
  });

  if (!response.ok) {
    throw new T1UserDraftApiError("The development draft review request failed.", response.status);
  }
  if (response.status === 204) return null;
  return response.json().catch(() => null) as Promise<unknown>;
}

function safeT1Error(error: unknown, fallback: string) {
  return new T1UserDraftApiError(
    fallback,
    error instanceof T1UserDraftApiError ? error.status : 503
  );
}

export async function prepareT1UserDraftReview(
  input: T1UserDraftPrepareRequest,
  signal?: AbortSignal
): Promise<T1UserDraftPrepareResponse> {
  try {
    const response = await requestT1("/v2/communication-analysis/user-draft/prepare", {
      method: "POST",
      signal,
      body: JSON.stringify(input)
    });
    const parsed = T1UserDraftPrepareResponseSchema.safeParse(response);
    if (!parsed.success) throw new T1UserDraftApiError("Invalid T1 preparation response.", 502);
    return parsed.data;
  } catch (error) {
    throw safeT1Error(error, "The fictional draft could not be prepared.");
  }
}

export async function continueT1UserDraftReview(
  input: T1UserDraftContinueRequest,
  signal?: AbortSignal
): Promise<T1UserDraftAnalysisResponse> {
  try {
    const response = await requestT1("/v2/communication-analysis/user-draft/continue", {
      method: "POST",
      signal,
      body: JSON.stringify(input)
    });
    const parsed = T1UserDraftAnalysisResponseSchema.safeParse(response);
    if (!parsed.success) throw new T1UserDraftApiError("Invalid T1 analysis response.", 502);
    return parsed.data;
  } catch (error) {
    throw safeT1Error(error, "The fictional review could not continue.");
  }
}

export async function clearT1UserDraftReview(
  input: T1UserDraftClearRequest,
  options: { signal?: AbortSignal; keepalive?: boolean } = {}
): Promise<void> {
  try {
    await requestT1("/v2/communication-analysis/user-draft/clear", {
      method: "POST",
      signal: options.signal,
      keepalive: options.keepalive,
      body: JSON.stringify(input)
    });
  } catch (error) {
    throw safeT1Error(error, "The short-lived review could not be cleared by the development API.");
  }
}
