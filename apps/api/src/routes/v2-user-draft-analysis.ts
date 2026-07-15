import {
  T1InternalPrepareResponseSchema,
  T1PrivacyReviewLimitation,
  T1UserDraftAnalysisResponseSchema,
  T1UserDraftClearRequestSchema,
  T1UserDraftContinueRequestSchema,
  T1UserDraftPrepareRequestSchema,
  T1UserDraftPrepareResponseSchema
} from "@clarity/shared";
import type { FastifyInstance, FastifyReply } from "fastify";
import type { SignalFetch } from "./v2-signal-analysis.js";
import type { SignalEngineSettings } from "../services/signal/settings.js";
import {
  UnavailableT1AuthenticationProvider,
  type T1AuthenticationProvider
} from "../services/signal/t1-auth.js";
import {
  UnavailableT1PrivacyAdmissionProvider,
  type T1PrivacyAdmissionProvider
} from "../services/signal/t1-admission.js";
import {
  isActiveT1Consent,
  T1_NOTICE_VERSION,
  T1_POLICY_VERSION,
  T1_USER_DRAFT_PURPOSE,
  UnavailableT1PurposeConsentProvider,
  type T1PurposeConsentProvider
} from "../services/signal/t1-consent.js";
import {
  T1EphemeralSessionStore,
  T1SessionCapacityError
} from "../services/signal/t1-session-store.js";

const MAX_PRIVATE_RESPONSE_BYTES = 64 * 1024;
const MAX_PUBLIC_REQUEST_BYTES = 24 * 1024;

export type T1UserDraftRouteOptions = Readonly<{
  settings: SignalEngineSettings;
  fetchImpl?: SignalFetch;
  authenticationProvider?: T1AuthenticationProvider;
  consentProvider?: T1PurposeConsentProvider;
  privacyAdmissionProvider?: T1PrivacyAdmissionProvider;
  sessionStore?: T1EphemeralSessionStore;
}>;

function generic(reply: FastifyReply, status: 400 | 401 | 403 | 410 | 413 | 422 | 429 | 503) {
  const messages = {
    400: "Invalid request.",
    401: "Authentication required.",
    403: "Consent or authority unavailable.",
    410: "Review session unavailable.",
    413: "Request too large.",
    422: "Language or privacy review unavailable.",
    429: "Request limit reached.",
    503: "Privacy processing unavailable."
  } as const;
  return reply.status(status).send({ error: messages[status] });
}

function applyPrivateResponseHeaders(reply: FastifyReply) {
  reply.header("Cache-Control", "no-store, max-age=0");
  reply.header("Pragma", "no-cache");
  reply.header("X-Content-Type-Options", "nosniff");
}

function createMemoryRateLimit(maximum: number, windowMs: number) {
  let startedAt = Date.now();
  let count = 0;
  return () => {
    const now = Date.now();
    if (now - startedAt >= windowMs) {
      startedAt = now;
      count = 0;
    }
    count += 1;
    return count <= maximum;
  };
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PRIVATE_RESPONSE_BYTES) {
    throw new Error("Private response exceeded its bound.");
  }
  if (!response.body) throw new Error("Private response body was absent.");
  const reader = response.body.getReader();
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    bytes += chunk.value.byteLength;
    if (bytes > MAX_PRIVATE_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("Private response exceeded its bound.");
    }
    chunks.push(chunk.value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function registerT1UserDraftAnalysisRoutes(
  app: FastifyInstance,
  options: T1UserDraftRouteOptions
) {
  const { settings } = options;
  if (
    !settings.enabled ||
    !settings.syntheticOnly ||
    !settings.t1ProtocolEnabled ||
    !settings.userAuthoredText ||
    settings.appEnvironment !== "test"
  ) {
    return;
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const authenticationProvider =
    options.authenticationProvider ?? new UnavailableT1AuthenticationProvider();
  const consentProvider = options.consentProvider ?? new UnavailableT1PurposeConsentProvider();
  const admissionProvider =
    options.privacyAdmissionProvider ?? new UnavailableT1PrivacyAdmissionProvider();
  const sessions = options.sessionStore ?? new T1EphemeralSessionStore();
  const withinRateLimit = createMemoryRateLimit(settings.rateLimitMax, settings.rateLimitWindowMs);
  let consentWithdrawalRevision = 0;

  const callPrivate = async (path: string, body: unknown, signal?: AbortSignal) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), settings.timeoutMs);
    const forwardAbort = () => controller.abort();
    signal?.addEventListener("abort", forwardAbort, { once: true });
    if (signal?.aborted) controller.abort();
    try {
      return await fetchImpl(`${settings.internalUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Service-Secret": settings.internalSecret ?? ""
        },
        body: JSON.stringify(body),
        redirect: "error",
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", forwardAbort);
    }
  };

  const clearInternal = async (internalNonce: string | null) => {
    if (!internalNonce) return;
    try {
      await callPrivate("/internal/v2/communication-analysis/text/clear", {
        schema_version: "2.0.0",
        internal_nonce: internalNonce
      });
    } catch {
      // A content-free best-effort cleanup; the private store also expires/restarts closed.
    }
  };

  const unsubscribeWithdrawal = consentProvider.onWithdrawal(async (subject) => {
    consentWithdrawalRevision += 1;
    await clearInternal(sessions.invalidateSubject(subject));
  });
  app.addHook("onClose", async () => {
    unsubscribeWithdrawal();
    sessions.dispose();
  });

  const routeOptions = {
    bodyLimit: MAX_PUBLIC_REQUEST_BYTES,
    logLevel: "silent" as const,
    errorHandler: async (error: { statusCode?: number }, _request: unknown, reply: FastifyReply) =>
      generic(reply, error.statusCode === 413 ? 413 : error.statusCode === 400 ? 400 : 503),
    onSend: async (_request: unknown, reply: FastifyReply, payload: unknown) => {
      applyPrivateResponseHeaders(reply);
      return payload;
    }
  };

  app.post(
    "/communication-analysis/user-draft/prepare",
    routeOptions,
    async (request, reply) => {
      if (!withinRateLimit()) return generic(reply, 429);
      const auth = await authenticationProvider.authenticate(request);
      if (!auth) return generic(reply, 401);

      const parsed = T1UserDraftPrepareRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        const sizeIssue = parsed.error.issues.some(
          (issue) => issue.path[0] === "draft" && issue.code === "too_big"
        );
        const languageIssue = parsed.error.issues.some((issue) => issue.path[0] === "languageTag");
        return generic(reply, sizeIssue ? 413 : languageIssue ? 422 : 400);
      }
      if (Buffer.byteLength(parsed.data.draft, "utf8") > 16_000) return generic(reply, 413);

      const consent = await consentProvider.getConsent(auth.subject, T1_USER_DRAFT_PURPOSE);
      if (consent === null || !isActiveT1Consent(consent, auth.subject)) {
        return generic(reply, 403);
      }
      const prepareConsentRevision = consentWithdrawalRevision;
      await clearInternal(sessions.invalidateSubject(auth.subject));
      const admission = await admissionProvider.current();
      if (!admission.admitted || !/^pa_[0-9a-f]{64}$/.test(admission.snapshot)) {
        return generic(reply, 503);
      }
      let preparedInternalNonce: string | null = null;
      let createdReviewToken: string | null = null;
      try {
        const upstream = await callPrivate("/internal/v2/communication-analysis/text/prepare", {
          schema_version: "2.0.0",
          task: parsed.data.task,
          profile_id: parsed.data.profileId,
          language_tag: parsed.data.languageTag,
          text: parsed.data.draft,
          authority: { source_class: parsed.data.sourceClass }
        });
        if (
          !upstream.ok ||
          !(upstream.headers.get("content-type") ?? "").toLowerCase().includes("application/json")
        ) {
          return generic(reply, upstream.status === 422 ? 422 : upstream.status === 429 ? 429 : 503);
        }
        const prepared = T1InternalPrepareResponseSchema.safeParse(await readBoundedJson(upstream));
        if (!prepared.success || prepared.data.admission_snapshot !== admission.snapshot) {
          return generic(reply, 503);
        }
        preparedInternalNonce = prepared.data.internal_nonce;
        const releaseConsent = await consentProvider.getConsent(
          auth.subject,
          T1_USER_DRAFT_PURPOSE
        );
        const releaseAdmission = await admissionProvider.current();
        if (
          consentWithdrawalRevision !== prepareConsentRevision ||
          releaseConsent === null ||
          !isActiveT1Consent(releaseConsent, auth.subject) ||
          releaseConsent.policyVersion !== consent.policyVersion ||
          releaseConsent.noticeVersion !== consent.noticeVersion ||
          releaseConsent.effectiveAt !== consent.effectiveAt
        ) {
          return generic(reply, 403);
        }
        if (
          !releaseAdmission.admitted ||
          releaseAdmission.snapshot !== admission.snapshot
        ) {
          return generic(reply, 503);
        }
        const session = sessions.create({
          subject: auth.subject,
          internalNonce: prepared.data.internal_nonce,
          task: parsed.data.task,
          profileId: parsed.data.profileId,
          admissionSnapshot: prepared.data.admission_snapshot,
          consentPolicyVersion: consent.policyVersion,
          consentNoticeVersion: consent.noticeVersion,
          consentEffectiveAt: consent.effectiveAt,
          redactedPreview: prepared.data.redacted_preview,
          minimizedTextBytes: prepared.data.sanitized_text_bytes,
          expiresAtMs: Date.parse(prepared.data.expires_at)
        });
        createdReviewToken = session.reviewToken;
        await clearInternal(session.replacedInternalNonce);
        const finalConsent = await consentProvider.getConsent(
          auth.subject,
          T1_USER_DRAFT_PURPOSE
        );
        const finalAdmission = await admissionProvider.current();
        if (
          consentWithdrawalRevision !== prepareConsentRevision ||
          finalConsent === null ||
          !isActiveT1Consent(finalConsent, auth.subject) ||
          finalConsent.policyVersion !== consent.policyVersion ||
          finalConsent.noticeVersion !== consent.noticeVersion ||
          finalConsent.effectiveAt !== consent.effectiveAt
        ) {
          return generic(reply, 403);
        }
        if (!finalAdmission.admitted || finalAdmission.snapshot !== admission.snapshot) {
          return generic(reply, 503);
        }
        const response = T1UserDraftPrepareResponseSchema.parse({
          schemaVersion: "2.0.0",
          reviewToken: session.reviewToken,
          expiresAt: session.expiresAt,
          redactedPreview: prepared.data.redacted_preview,
          potentialIdentifierCounts: prepared.data.potential_identifier_counts,
          detectorVersion: prepared.data.detector_version,
          previewHash: session.previewHash,
          limitation: T1PrivacyReviewLimitation
        });
        createdReviewToken = null;
        preparedInternalNonce = null;
        return reply.status(200).send(response);
      } catch (error) {
        if (error instanceof T1SessionCapacityError) return generic(reply, 429);
        return generic(reply, 503);
      } finally {
        const createdInternalNonce = createdReviewToken
          ? sessions.consume(createdReviewToken)
          : null;
        const cleanupNonces = new Set(
          [createdInternalNonce, preparedInternalNonce].filter(
            (nonce): nonce is string => nonce !== null
          )
        );
        await Promise.all([...cleanupNonces].map((nonce) => clearInternal(nonce)));
      }
    }
  );

  app.post(
    "/communication-analysis/user-draft/continue",
    routeOptions,
    async (request, reply) => {
      if (!withinRateLimit()) return generic(reply, 429);
      const auth = await authenticationProvider.authenticate(request);
      if (!auth) return generic(reply, 401);
      const parsed = T1UserDraftContinueRequestSchema.safeParse(request.body);
      if (!parsed.success) return generic(reply, 400);

      const consent = await consentProvider.getConsent(auth.subject, T1_USER_DRAFT_PURPOSE);
      if (consent === null || !isActiveT1Consent(consent, auth.subject)) {
        await clearInternal(sessions.invalidateSubject(auth.subject));
        return generic(reply, 403);
      }
      const claimed = sessions.claim(parsed.data.reviewToken, auth.subject);
      if (claimed.status === "forbidden") return generic(reply, 403);
      if (claimed.status === "gone") return generic(reply, 410);
      if (claimed.status === "integrity_failure") return generic(reply, 503);
      if (
        claimed.claim.consentPolicyVersion !== T1_POLICY_VERSION ||
        claimed.claim.consentNoticeVersion !== T1_NOTICE_VERSION ||
        claimed.claim.consentPolicyVersion !== consent.policyVersion ||
        claimed.claim.consentNoticeVersion !== consent.noticeVersion ||
        claimed.claim.consentEffectiveAt !== consent.effectiveAt
      ) {
        sessions.consume(parsed.data.reviewToken);
        await clearInternal(claimed.claim.internalNonce);
        return generic(reply, 403);
      }

      try {
        const currentAdmission = await admissionProvider.current();
        if (
          !currentAdmission.admitted ||
          currentAdmission.snapshot !== claimed.claim.admissionSnapshot
        ) {
          return generic(reply, 503);
        }
        const upstream = await callPrivate(
          "/internal/v2/communication-analysis/text/continue",
          {
            schema_version: "2.0.0",
            internal_nonce: claimed.claim.internalNonce,
            confirmation: true,
            admission_snapshot: claimed.claim.admissionSnapshot
          },
          claimed.claim.signal
        );
        if (
          !upstream.ok ||
          !(upstream.headers.get("content-type") ?? "").toLowerCase().includes("application/json")
        ) {
          return generic(reply, upstream.status === 422 ? 422 : upstream.status === 410 ? 410 : 503);
        }
        const analysis = T1UserDraftAnalysisResponseSchema.safeParse(await readBoundedJson(upstream));
        if (!analysis.success) return generic(reply, 503);
        const releaseAdmission = await admissionProvider.current();
        if (
          claimed.claim.signal.aborted ||
          !releaseAdmission.admitted ||
          releaseAdmission.snapshot !== claimed.claim.admissionSnapshot
        ) {
          return generic(reply, 503);
        }
        const releaseConsent = await consentProvider.getConsent(
          auth.subject,
          T1_USER_DRAFT_PURPOSE
        );
        if (
          claimed.claim.signal.aborted ||
          releaseConsent === null ||
          !isActiveT1Consent(releaseConsent, auth.subject) ||
          releaseConsent.policyVersion !== claimed.claim.consentPolicyVersion ||
          releaseConsent.noticeVersion !== claimed.claim.consentNoticeVersion ||
          releaseConsent.effectiveAt !== claimed.claim.consentEffectiveAt
        ) {
          return generic(reply, 403);
        }
        return reply.status(200).send(analysis.data);
      } catch {
        return generic(reply, 503);
      } finally {
        sessions.consume(parsed.data.reviewToken);
        await clearInternal(claimed.claim.internalNonce);
      }
    }
  );

  app.post(
    "/communication-analysis/user-draft/clear",
    routeOptions,
    async (request, reply) => {
      const auth = await authenticationProvider.authenticate(request);
      if (!auth) return generic(reply, 401);
      const parsed = T1UserDraftClearRequestSchema.safeParse(request.body);
      if (!parsed.success) return generic(reply, 400);
      const cleared = sessions.clear(parsed.data.reviewToken, auth.subject);
      if (cleared.status === "forbidden") return generic(reply, 403);
      await clearInternal(cleared.internalNonce);
      return reply.status(204).send();
    }
  );
}
