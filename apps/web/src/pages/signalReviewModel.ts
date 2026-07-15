import type {
  CommunicationAnalysisRequest,
  CommunicationAnalysisResponse
} from "@clarity/shared";

export const SIGNAL_REVIEW_COPY = {
  title: "Review a fictional communication signal",
  syntheticOnly: "This optional local review uses tracked fictional text only.",
  receiptHeading: "Privacy receipt preview",
  confirmation:
    "I reviewed the fictional preview and potential-identifier simulation and understand this flow is synthetic only.",
  continue: "Continue with fictional fixture",
  clear: "Clear session",
  editNote: "Edits stay in this tab and are never submitted or saved by this flow."
} as const;

export const SIGNAL_FIXTURE_OPTIONS: Array<{
  id: CommunicationAnalysisRequest["fixtureId"];
  label: string;
  description: string;
  preview: string;
  redactedPreview: string;
  potentialCategories: readonly string[];
}> = [
  {
    id: "wording_us_direct",
    label: "Direct plan",
    description: "A fictional direct meeting proposal with a flexible fallback.",
    preview: "I would like to meet on Saturday afternoon. If that does not work, another day is fine.",
    redactedPreview: "I would like to meet on ⟦POTENTIAL_DATE_TIME⟧. If that does not work, another day is fine.",
    potentialCategories: ["date or time"]
  },
  {
    id: "structure_eu_transition",
    label: "Structured transition",
    description: "A fictional note that changes topic and then returns to a plan.",
    preview: "By the way, the museum sounds good. Looping back, I prefer a quiet cafe first, and then I can decide after I check the time.",
    redactedPreview: "By the way, the ⟦POTENTIAL_PLACE⟧ sounds good. Looping back, I prefer a quiet cafe first, and then I can decide after I check the time.",
    potentialCategories: ["place"]
  },
  {
    id: "wording_gb_repair",
    label: "Repair note",
    description: "A fictional clarification after an earlier message felt unclear.",
    preview: "I think my earlier note was unclear. What I meant was: maybe we could meet on Saturday afternoon, if that is okay.",
    redactedPreview: "I think my earlier note was unclear. What I meant was: maybe we could meet on ⟦POTENTIAL_DATE_TIME⟧, if that is okay.",
    potentialCategories: ["date or time"]
  },
  {
    id: "low_signal_greeting",
    label: "Short greeting",
    description: "A deliberately short fictional note used to verify abstention.",
    preview: "Hello there.",
    redactedPreview: "Hello there.",
    potentialCategories: []
  }
];

export type SignalReviewState = Omit<
  CommunicationAnalysisRequest,
  "redactionReviewConfirmed"
> & {
  redactionReviewConfirmed: boolean;
  phase: "setup" | "loading" | "result" | "error";
  analysis: CommunicationAnalysisResponse | null;
  editableRepairText: string;
  error: string | null;
  requestRevision: number;
};

export type SignalReviewAction =
  | { type: "select_fixture"; value: CommunicationAnalysisRequest["fixtureId"] }
  | { type: "select_task"; value: CommunicationAnalysisRequest["task"] }
  | { type: "select_profile"; value: CommunicationAnalysisRequest["profileId"] }
  | { type: "confirm_review"; value: boolean }
  | { type: "start" }
  | { type: "succeed"; value: CommunicationAnalysisResponse; revision: number }
  | { type: "fail"; revision: number }
  | { type: "edit_repair"; value: string }
  | { type: "clear" };

export function createInitialSignalReviewState(): SignalReviewState {
  return {
    phase: "setup",
    fixtureId: "wording_us_direct",
    task: "draft_review",
    profileId: "wording_support",
    redactionReviewConfirmed: false,
    analysis: null,
    editableRepairText: "",
    error: null,
    requestRevision: 0
  };
}

export function signalReviewReducer(
  state: SignalReviewState,
  action: SignalReviewAction
): SignalReviewState {
  switch (action.type) {
    case "select_fixture":
      return {
        ...state,
        fixtureId: action.value,
        task: action.value === "wording_gb_repair" ? "message_excerpt_review" : "draft_review",
        analysis: null,
        phase: "setup",
        redactionReviewConfirmed: false,
        editableRepairText: "",
        error: null,
        requestRevision: state.requestRevision + 1
      };
    case "select_task":
      return {
        ...state,
        task: action.value,
        fixtureId:
          action.value === "message_excerpt_review"
            ? "wording_gb_repair"
            : state.fixtureId === "wording_gb_repair"
              ? "wording_us_direct"
              : state.fixtureId,
        analysis: null,
        phase: "setup",
        redactionReviewConfirmed: false,
        editableRepairText: "",
        error: null,
        requestRevision: state.requestRevision + 1
      };
    case "select_profile":
      return {
        ...state,
        profileId: action.value,
        analysis: null,
        phase: "setup",
        redactionReviewConfirmed: false,
        editableRepairText: "",
        error: null,
        requestRevision: state.requestRevision + 1
      };
    case "confirm_review":
      return {
        ...state,
        redactionReviewConfirmed: action.value,
        error: null,
        requestRevision:
          state.phase === "loading" ? state.requestRevision + 1 : state.requestRevision,
        phase: state.phase === "loading" ? "setup" : state.phase
      };
    case "start":
      if (!state.redactionReviewConfirmed) return state;
      return {
        ...state,
        phase: "loading",
        analysis: null,
        error: null,
        requestRevision: state.requestRevision + 1
      };
    case "succeed":
      if (action.revision !== state.requestRevision) return state;
      return {
        ...state,
        phase: "result",
        analysis: action.value,
        editableRepairText: action.value.repair_action?.editable_text ?? "",
        error: null
      };
    case "fail":
      if (action.revision !== state.requestRevision) return state;
      return {
        ...state,
        phase: "error",
        analysis: null,
        editableRepairText: "",
        error: "The fictional analysis could not be completed. Nothing was saved by this flow."
      };
    case "edit_repair":
      return { ...state, editableRepairText: action.value };
    case "clear":
      return {
        ...createInitialSignalReviewState(),
        requestRevision: state.requestRevision + 1
      };
  }
}

export function isSignalEngineUiEnabled(value: unknown, isDevelopment = false) {
  return isDevelopment && value === "true";
}
