import type {
  T1UserDraftAnalysisResponse,
  T1UserDraftPrepareRequest,
  T1UserDraftPrepareResponse
} from "@clarity/shared";

export const T1_USER_DRAFT_COPY = {
  title: "Prepare a fictional self-authored draft",
  notice:
    "Development readiness scaffold only. Enter fictional text that you wrote for this test; do not paste a real message, received message, contact detail, diagnosis, or private conversation.",
  privacyLimitation:
    "Potential identifiers can remain after automated replacement. Review the minimised preview before choosing whether to continue.",
  clearLimitation:
    "Clear removes this tab's in-memory view and asks the development API to invalidate its short-lived review. It is not a secure-erasure claim.",
  expiryLimitation:
    "The short-lived review expired. This tab cleared the fictional draft and asked the development API to invalidate the review."
} as const;

export const T1_DEFAULT_FICTIONAL_DRAFT =
  "By the way, the fictional museum plan sounds good. Looping back, I would prefer a quiet cafe first. Would Saturday afternoon work for this test?";

export type T1UserDraftReviewPhase =
  | "draft"
  | "preparing"
  | "review"
  | "continuing"
  | "result"
  | "error"
  | "cleared"
  | "expired";

export type T1UserDraftReviewState = {
  draft: string;
  profileId: T1UserDraftPrepareRequest["profileId"];
  languageTag: T1UserDraftPrepareRequest["languageTag"];
  selfAuthoredConfirmed: boolean;
  redactedReviewConfirmed: boolean;
  phase: T1UserDraftReviewPhase;
  preparation: T1UserDraftPrepareResponse | null;
  analysis: T1UserDraftAnalysisResponse | null;
  editableRepairText: string;
  error: string | null;
  requestRevision: number;
};

export type T1UserDraftReviewAction =
  | { type: "edit_draft"; value: string; revision: number }
  | { type: "select_profile"; value: T1UserDraftReviewState["profileId"]; revision: number }
  | { type: "select_language"; value: T1UserDraftReviewState["languageTag"]; revision: number }
  | { type: "confirm_self_authored"; value: boolean; revision: number }
  | { type: "prepare_start"; revision: number }
  | { type: "prepare_succeed"; value: T1UserDraftPrepareResponse; revision: number }
  | { type: "prepare_fail"; revision: number }
  | { type: "confirm_redacted_review"; value: boolean }
  | { type: "continue_start"; revision: number }
  | { type: "continue_succeed"; value: T1UserDraftAnalysisResponse; revision: number }
  | { type: "continue_fail"; revision: number }
  | { type: "edit_repair"; value: string }
  | { type: "clear"; revision: number }
  | { type: "expire"; revision: number };

export function createInitialT1UserDraftReviewState(): T1UserDraftReviewState {
  return {
    draft: T1_DEFAULT_FICTIONAL_DRAFT,
    profileId: "wording_support",
    languageTag: "en-EU",
    selfAuthoredConfirmed: false,
    redactedReviewConfirmed: false,
    phase: "draft",
    preparation: null,
    analysis: null,
    editableRepairText: "",
    error: null,
    requestRevision: 0
  };
}

function invalidatePreparedReview(
  state: T1UserDraftReviewState,
  revision: number
): T1UserDraftReviewState {
  return {
    ...state,
    redactedReviewConfirmed: false,
    phase: "draft",
    preparation: null,
    analysis: null,
    editableRepairText: "",
    error: null,
    requestRevision: revision
  };
}

export function t1UserDraftReviewReducer(
  state: T1UserDraftReviewState,
  action: T1UserDraftReviewAction
): T1UserDraftReviewState {
  switch (action.type) {
    case "edit_draft":
      return {
        ...invalidatePreparedReview(state, action.revision),
        draft: action.value
      };
    case "select_profile":
      return {
        ...invalidatePreparedReview(state, action.revision),
        profileId: action.value
      };
    case "select_language":
      return {
        ...invalidatePreparedReview(state, action.revision),
        languageTag: action.value
      };
    case "confirm_self_authored":
      return {
        ...invalidatePreparedReview(state, action.revision),
        selfAuthoredConfirmed: action.value
      };
    case "prepare_start":
      if (!state.selfAuthoredConfirmed || state.draft.trim().length === 0) return state;
      return {
        ...state,
        phase: "preparing",
        preparation: null,
        analysis: null,
        editableRepairText: "",
        error: null,
        requestRevision: action.revision
      };
    case "prepare_succeed":
      if (action.revision !== state.requestRevision) return state;
      return {
        ...state,
        draft: "",
        phase: "review",
        preparation: action.value,
        redactedReviewConfirmed: false,
        error: null
      };
    case "prepare_fail":
      if (action.revision !== state.requestRevision) return state;
      return {
        ...state,
        phase: "error",
        preparation: null,
        analysis: null,
        error: "The fictional draft could not be prepared. The response was not used or displayed."
      };
    case "confirm_redacted_review":
      return {
        ...state,
        redactedReviewConfirmed: action.value,
        error: null
      };
    case "continue_start":
      if (!state.preparation || !state.redactedReviewConfirmed) return state;
      return {
        ...state,
        phase: "continuing",
        analysis: null,
        editableRepairText: "",
        error: null,
        requestRevision: action.revision
      };
    case "continue_succeed":
      if (action.revision !== state.requestRevision) return state;
      return {
        ...state,
        phase: "result",
        preparation: null,
        redactedReviewConfirmed: false,
        analysis: action.value,
        editableRepairText: action.value.repair_action?.editable_text ?? "",
        error: null
      };
    case "continue_fail":
      if (action.revision !== state.requestRevision) return state;
      return {
        ...state,
        phase: "error",
        preparation: null,
        analysis: null,
        redactedReviewConfirmed: false,
        editableRepairText: "",
        error:
          "The short-lived review could not continue. Prepare the fictional draft again if you want to retry."
      };
    case "edit_repair":
      return { ...state, editableRepairText: action.value };
    case "clear":
      return {
        ...createInitialT1UserDraftReviewState(),
        draft: "",
        phase: "cleared",
        requestRevision: action.revision
      };
    case "expire":
      return {
        ...createInitialT1UserDraftReviewState(),
        draft: "",
        phase: "expired",
        requestRevision: action.revision
      };
  }
}

export function isT1UserDraftUiEnabled(
  signalEngineFlag: unknown,
  t1UserDraftFlag: unknown,
  isDevelopment = false
) {
  return isDevelopment && signalEngineFlag === "true" && t1UserDraftFlag === "true";
}
