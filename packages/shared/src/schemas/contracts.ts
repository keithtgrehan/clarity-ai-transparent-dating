import { z } from "zod";
import {
  ConversationListItemSchema,
  MatchCandidateSchema,
  MessageSchema,
  ProfileAnalysisSchema,
  ProfileSchema,
  ReportSchema,
  WaitlistLeadSchema
} from "./domain.js";

export const ProfileInputSchema = ProfileSchema.omit({
  userId: true,
  summary: true,
  profileSummary: true,
  profileCompleteness: true,
  onboardingCompleted: true,
  createdAt: true,
  updatedAt: true
});

function requireOnboardingField<T>(
  value: T | undefined,
  path: Array<string | number>,
  message: string,
  context: z.RefinementCtx
) {
  if (value === undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message,
      path
    });
  }
}

export const OnboardingProfileInputSchema = ProfileInputSchema.superRefine((profile, context) => {
  requireOnboardingField(
    profile.identity,
    ["identity"],
    "Choose whether you identify as ADHD, Autism, AuDHD, or another supported option.",
    context
  );

  if (profile.openTo.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Choose at least one identity group to match with.",
      path: ["openTo"]
    });
  }

  requireOnboardingField(
    profile.diagnosisStatus,
    ["diagnosisStatus"],
    "Choose a diagnosis status.",
    context
  );
  requireOnboardingField(
    profile.communicationStyle,
    ["communicationStyle"],
    "Choose a communication style.",
    context
  );
  requireOnboardingField(
    profile.socialEnergy,
    ["socialEnergy"],
    "Choose a social energy level.",
    context
  );
  requireOnboardingField(
    profile.sensoryProfile.noise,
    ["sensoryProfile", "noise"],
    "Choose a noise preference.",
    context
  );
  requireOnboardingField(
    profile.sensoryProfile.crowd,
    ["sensoryProfile", "crowd"],
    "Choose a crowd preference.",
    context
  );
  requireOnboardingField(
    profile.sensoryProfile.calm,
    ["sensoryProfile", "calm"],
    "Choose how much calm matters.",
    context
  );
  requireOnboardingField(
    profile.routinePreference,
    ["routinePreference"],
    "Choose a routine preference.",
    context
  );
  requireOnboardingField(
    profile.relationshipIntent,
    ["relationshipIntent"],
    "Choose a relationship intent.",
    context
  );
});

export const CreateWaitlistLeadInputSchema = WaitlistLeadSchema.omit({
  id: true,
  createdAt: true
});

export const UpsertProfileInputSchema = ProfileInputSchema;

export const SubmitOnboardingInputSchema = z.object({
  userId: z.string().min(1),
  profile: OnboardingProfileInputSchema
});

export const CreateConversationInputSchema = z.object({
  participantUserIds: z.array(z.string().min(1)).length(2)
});

export const SendMessageInputSchema = z.object({
  conversationId: z.string().min(1),
  senderUserId: z.string().min(1),
  body: z.string().trim().min(1).max(2000)
});

export const CreateReportInputSchema = ReportSchema.omit({
  id: true,
  createdAt: true,
  status: true
});

export const ProfileResponseSchema = z.object({
  exists: z.boolean(),
  profile: ProfileSchema,
  analysis: ProfileAnalysisSchema
});

export const MatchCandidateListResponseSchema = z.object({
  userId: z.string().min(1),
  candidates: z.array(MatchCandidateSchema)
});

export const ConversationListResponseSchema = z.object({
  userId: z.string().min(1),
  conversations: z.array(ConversationListItemSchema)
});

export const ConversationMessagesResponseSchema = z.object({
  conversation: ConversationListItemSchema,
  messages: z.array(MessageSchema),
  firstMessagePrompt: z.string().trim().min(1).max(200).optional()
});

/**
 * Closed synthetic-only contract for the private communication-analysis adapter.
 * The browser never supplies text: it selects one tracked fictional fixture and
 * confirms the redaction review before the Fastify boundary resolves any content.
 */
export const CommunicationAnalysisFixtureIdSchema = z.enum([
  "wording_us_direct",
  "wording_gb_repair",
  "structure_eu_transition",
  "low_signal_greeting"
]);

export const CommunicationAnalysisTaskSchema = z.enum([
  "draft_review",
  "message_excerpt_review"
]);

export const CommunicationAnalysisProfileIdSchema = z.enum([
  "wording_support",
  "structure_support"
]);

export const CommunicationAnalysisRequestSchema = z
  .object({
    fixtureId: CommunicationAnalysisFixtureIdSchema,
    task: CommunicationAnalysisTaskSchema,
    profileId: CommunicationAnalysisProfileIdSchema,
    redactionReviewConfirmed: z.literal(true)
  })
  .strict()
  .superRefine((request, context) => {
    const expectedTask =
      request.fixtureId === "wording_gb_repair" ? "message_excerpt_review" : "draft_review";
    if (request.task !== expectedTask) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "The selected fixture is not allowlisted for this task.",
        path: ["task"]
      });
    }
  });

export const PrivacyReceiptCategorySchema = z.enum([
  "person_name",
  "location",
  "contact",
  "online_handle",
  "identifier",
  "other"
]);

export const CommunicationAnalysisCanonicalCueIdSchema = z.enum([
  "communication.directness",
  "communication.ambiguity",
  "communication.pressure",
  "communication.reassurance_request",
  "communication.reassurance_repetition",
  "communication.repair",
  "structure.explicit_transition",
  "structure.high_lexical_density",
  "structure.long_information_run",
  "structure.processing_request",
  "structure.response_window_present",
  "structure.response_window_missing",
  "structure.thinking_aloud",
  "structure.final_position",
  "structure.reciprocity_offer",
  "structure.channel_switch_offer",
  "structure.multi_request_load"
]);

export const CommunicationAnalysisCueCopy = {
  "communication.directness": {
    observation: "The wording contains an explicit preference or request.",
    limitation: "This rule does not measure honesty, confidence, intent, or likely response.",
    repair_action: {
      title: "Edit one directness step",
      editable_text: "Keep one concrete preference and one answerable next step.",
      rationale: "This optional edit follows the displayed wording or structure cue."
    }
  },
  "communication.ambiguity": {
    observation: "The wording contains one or more uncertainty markers.",
    limitation: "Uncertainty markers can be considerate or accurate; they do not reveal confidence or intent.",
    repair_action: {
      title: "Edit one ambiguity step",
      editable_text: "If you know your preference, state it before the uncertainty marker.",
      rationale: "This optional edit follows the displayed wording or structure cue."
    }
  },
  "communication.pressure": {
    observation: "The wording combines a second-person obligation with urgency or proof language.",
    limitation: "This is a wording check, not a finding about coercion, safety, motive, or character.",
    repair_action: {
      title: "Edit one pressure step",
      editable_text: "Replace the demand with a request and leave an explicit choice or response window.",
      rationale: "This optional edit follows the displayed wording or structure cue."
    }
  },
  "communication.reassurance_request": {
    observation: "The wording includes a direct request for reassurance.",
    limitation: "The rule cannot identify need, attachment, distress, or relationship quality.",
    repair_action: {
      title: "Edit one reassurance request step",
      editable_text: "Ask one answerable question about the specific situation.",
      rationale: "This optional edit follows the displayed wording or structure cue."
    }
  },
  "communication.reassurance_repetition": {
    observation: "More than one reassurance request appears in this message.",
    limitation: "Repetition alone does not establish compulsion, anxiety, or pressure.",
    repair_action: {
      title: "Edit one reassurance repetition step",
      editable_text: "Keep the single reassurance question that is easiest to answer.",
      rationale: "This optional edit follows the displayed wording or structure cue."
    }
  },
  "communication.repair": {
    observation: "The message explicitly rephrases, corrects, or acknowledges a misunderstanding.",
    limitation: "A repair marker does not prove resolution or assign responsibility.",
    repair_action: {
      title: "Edit one repair step",
      editable_text: "Put the corrected meaning in one sentence after the repair marker.",
      rationale: "This optional edit follows the displayed wording or structure cue."
    }
  },
  "structure.explicit_transition": {
    observation: "The message uses an explicit topic-navigation phrase.",
    limitation: "This describes structure only and does not assess linearity, cognition, or neurotype.",
    repair_action: {
      title: "Edit one explicit transition step",
      editable_text: "Keep the transition and name the topic that follows it.",
      rationale: "This optional edit follows the displayed wording or structure cue."
    }
  },
  "structure.high_lexical_density": {
    observation: "This message has a high proportion of content words under the configured heuristic.",
    limitation: "Lexical density is length- and dialect-sensitive and does not assess communication ability or quality.",
    repair_action: {
      title: "Edit one high lexical density step",
      editable_text: "Add a short summary sentence before the detail.",
      rationale: "This optional edit follows the displayed wording or structure cue."
    }
  },
  "structure.long_information_run": {
    observation: "A long run of details appears without a short summary break.",
    limitation: "Long turns can support rapport; this rule does not assess cognition or communication quality.",
    repair_action: {
      title: "Edit one long information run step",
      editable_text: "Move the main point to the first sentence and offer the rest as optional detail.",
      rationale: "This optional edit follows the displayed wording or structure cue."
    }
  },
  "structure.processing_request": {
    observation: "The wording explicitly asks for time before responding.",
    limitation: "This does not identify a cognitive state, disability, or reason for the pause.",
    repair_action: {
      title: "Edit one processing request step",
      editable_text: "Keep the time request and add a realistic return window if you can.",
      rationale: "This optional edit follows the displayed wording or structure cue."
    }
  },
  "structure.response_window_present": {
    observation: "A processing-time request includes a return window.",
    limitation: "The rule cannot predict whether the window will be met.",
    repair_action: {
      title: "Edit one response window present step",
      editable_text: "Keep the return window specific enough to be useful and easy to revise.",
      rationale: "This optional edit follows the displayed wording or structure cue."
    }
  },
  "structure.response_window_missing": {
    observation: "A processing-time request does not include a return window.",
    limitation: "A missing window may be appropriate when timing is genuinely unknown.",
    repair_action: {
      title: "Edit one response window missing step",
      editable_text: "If possible, add when you will next update them—even if the answer is not ready.",
      rationale: "This optional edit follows the displayed wording or structure cue."
    }
  },
  "structure.thinking_aloud": {
    observation: "The message labels part of the wording as thinking aloud.",
    limitation: "This does not infer indecision or a mental process beyond the explicit words.",
    repair_action: {
      title: "Edit one thinking aloud step",
      editable_text: "Separate the thinking-aloud section from your current position.",
      rationale: "This optional edit follows the displayed wording or structure cue."
    }
  },
  "structure.final_position": {
    observation: "The message explicitly labels a current answer or position.",
    limitation: "The rule cannot determine certainty, permanence, or sincerity.",
    repair_action: {
      title: "Edit one final position step",
      editable_text: "Keep the current answer in one sentence and label what remains open.",
      rationale: "This optional edit follows the displayed wording or structure cue."
    }
  },
  "structure.reciprocity_offer": {
    observation: "The message offers the other person a choice about how much context to receive.",
    limitation: "This does not measure reciprocity or relationship quality.",
    repair_action: {
      title: "Edit one reciprocity offer step",
      editable_text: "Keep the choice concrete: short version, full context, or another time.",
      rationale: "This optional edit follows the displayed wording or structure cue."
    }
  },
  "structure.channel_switch_offer": {
    observation: "The message offers another communication channel or time.",
    limitation: "A channel change is an option, not evidence that one channel is better.",
    repair_action: {
      title: "Edit one channel switch offer step",
      editable_text: "Offer no more than two channel or timing options.",
      rationale: "This optional edit follows the displayed wording or structure cue."
    }
  },
  "structure.multi_request_load": {
    observation: "The message contains three or more separate questions.",
    limitation: "Question count is a message-load proxy, not a cognitive-load or pressure measurement.",
    repair_action: {
      title: "Edit one multi request load step",
      editable_text: "Lead with the one question that needs an answer first.",
      rationale: "This optional edit follows the displayed wording or structure cue."
    }
  }
} as const;

export const CommunicationAnalysisLimitations = [
  "Deterministic wording checks are not peer-reviewed inference models.",
  "Results do not infer diagnosis, emotion, attraction, intent, compatibility, or outcomes.",
  "Dialect and mixed-language behavior is not benchmarked for participant use."
] as const;

const privacyReceiptPolicy = {
  deterministic_patterns_synthetic_fixture_only: {
    status: "SYNTHETIC_FIXTURE_PATTERN_CHECK_ONLY",
    limitation: "This tracked fictional fixture received deterministic identifier-pattern checks only; this is not evidence of real-text anonymisation."
  },
  deterministic_patterns_plus_local_spacy: {
    status: "LOCAL_SPACY_APPLIED",
    limitation: "Identifier minimisation reduces exposure but cannot guarantee anonymity or remove all sensitive context."
  },
  deterministic_patterns_plus_synthetic_test_double: {
    status: "SYNTHETIC_TEST_DOUBLE_APPLIED",
    limitation: "A synthetic test double exercised this privacy boundary; it is not evidence that spaCy or a production detector ran."
  }
} as const;

export const CommunicationAnalysisCueSchema = z
  .object({
    canonical_id: CommunicationAnalysisCanonicalCueIdSchema,
    observation: z.string().trim().min(1).max(400),
    limitation: z.string().trim().min(1).max(400),
    sanitized_range: z
      .object({
        start: z.number().int().nonnegative(),
        end: z.number().int().positive().max(4_000)
      })
      .strict()
      .refine((range) => range.end > range.start, "Range end must be after its start.")
      .nullable(),
    evidence_sufficiency: z.literal("deterministic")
  })
  .strict();

export const CommunicationAnalysisResponseSchema = z
  .object({
    schema_version: z.literal("1.0.0"),
    analysis_id: z.string().regex(/^an_[0-9a-f]{24}$/),
    low_signal: z.boolean(),
    privacy_receipt: z
      .object({
        method: z.enum([
          "deterministic_patterns_synthetic_fixture_only",
          "deterministic_patterns_plus_local_spacy",
          "deterministic_patterns_plus_synthetic_test_double"
        ]),
        redaction_counts: z
          .object({
            person_name: z.number().int().nonnegative().max(10_000),
            location: z.number().int().nonnegative().max(10_000),
            contact: z.number().int().nonnegative().max(10_000),
            online_handle: z.number().int().nonnegative().max(10_000),
            identifier: z.number().int().nonnegative().max(10_000),
            other: z.number().int().nonnegative().max(10_000)
          })
          .strict(),
        redaction_total: z.number().int().nonnegative().max(10_000),
        local_ner_status: z.enum([
          "SYNTHETIC_FIXTURE_PATTERN_CHECK_ONLY",
          "LOCAL_SPACY_APPLIED",
          "SYNTHETIC_TEST_DOUBLE_APPLIED"
        ]),
        text_released: z.literal(false),
        text_persisted: z.literal(false),
        limitation: z.string().trim().min(1).max(400)
      })
      .strict(),
    cues: z.array(CommunicationAnalysisCueSchema).max(3),
    repair_action: z
      .object({
        title: z.string().trim().min(1).max(80),
        editable_text: z.string().trim().min(1).max(240),
        rationale: z.string().trim().min(1).max(240)
      })
      .strict()
      .nullable(),
    limitations: z.array(z.string().trim().min(1).max(400)).min(1).max(6),
    provenance: z
      .object({
        engine_version: z.literal("0.1.0"),
        ruleset_version: z.literal("2026-07-15.1"),
        cue_registry_version: z.literal("1.0.0"),
        semantic_model_id: z.literal("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"),
        semantic_model_revision: z.literal("e8f8c211226b894fcb81acc59f3b34ba3efd5f42"),
        semantic_status: z.enum([
          "abstain_model_not_local",
          "abstain_disabled_by_policy"
        ])
      })
      .strict()
  })
  .strict()
  .superRefine((analysis, context) => {
    const receiptPolicy = privacyReceiptPolicy[analysis.privacy_receipt.method];
    if (
      analysis.privacy_receipt.local_ner_status !== receiptPolicy.status ||
      analysis.privacy_receipt.limitation !== receiptPolicy.limitation
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Privacy receipt method, status and copy must use one reviewed policy.",
        path: ["privacy_receipt"]
      });
    }

    const countedTotal = Object.values(analysis.privacy_receipt.redaction_counts).reduce(
      (total, count) => total + count,
      0
    );
    if (countedTotal !== analysis.privacy_receipt.redaction_total) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Redaction total must equal the fixed category counts.",
        path: ["privacy_receipt", "redaction_total"]
      });
    }

    if (new Set(analysis.cues.map((cue) => cue.canonical_id)).size !== analysis.cues.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cue identifiers must be unique within a result.",
        path: ["cues"]
      });
    }

    for (const [index, cue] of analysis.cues.entries()) {
      const copy = CommunicationAnalysisCueCopy[cue.canonical_id];
      if (cue.observation !== copy.observation || cue.limitation !== copy.limitation) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cue copy must match the reviewed canonical registry.",
          path: ["cues", index]
        });
      }
    }

    if (
      analysis.limitations.length !== CommunicationAnalysisLimitations.length ||
      analysis.limitations.some((value, index) => value !== CommunicationAnalysisLimitations[index])
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Analysis limitations must use the reviewed fixed copy.",
        path: ["limitations"]
      });
    }

    if (analysis.low_signal && analysis.repair_action !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Low-signal results cannot include a repair action.",
        path: ["repair_action"]
      });
    }

    if (analysis.cues.length === 0 && analysis.repair_action !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A result without cues cannot include a repair action.",
        path: ["repair_action"]
      });
    }

    if (analysis.cues.length > 0) {
      const expectedRepair = CommunicationAnalysisCueCopy[analysis.cues[0].canonical_id].repair_action;
      if (
        analysis.repair_action === null ||
        analysis.repair_action.title !== expectedRepair.title ||
        analysis.repair_action.editable_text !== expectedRepair.editable_text ||
        analysis.repair_action.rationale !== expectedRepair.rationale
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A cue-bearing result requires exactly one reviewed repair action.",
          path: ["repair_action"]
        });
      }
    }

    if (analysis.low_signal && analysis.cues.length !== 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Low-signal results cannot include cues.",
        path: ["cues"]
      });
    }
  });
