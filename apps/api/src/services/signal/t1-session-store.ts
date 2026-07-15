import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const TOKEN_PREFIX = "rt_";
const PREVIEW_HASH_PREFIX = "ph_";
const MAX_TTL_MS = 10 * 60_000;
const MAX_SESSIONS = 1_000;
const MAX_MINIMIZED_TEXT_BYTES = 16 * 1024 * 1024;

export type T1SessionInput = Readonly<{
  subject: string;
  internalNonce: string;
  task: "draft_review";
  profileId: "structure_support" | "wording_support";
  admissionSnapshot: string;
  consentPolicyVersion: string;
  consentNoticeVersion: string;
  consentEffectiveAt: string;
  redactedPreview: string;
  minimizedTextBytes: number;
  expiresAtMs: number;
}>;

type StoredT1Session = Readonly<{
  tokenHash: string;
  subject: string;
  internalNonce: string;
  task: "draft_review";
  profileId: "structure_support" | "wording_support";
  admissionSnapshot: string;
  consentPolicyVersion: string;
  consentNoticeVersion: string;
  consentEffectiveAt: string;
  previewHash: string;
  integritySeal: string;
  minimizedTextBytes: number;
  expiresAtMs: number;
  expiresAtMonotonicMs: number;
  abortController: AbortController;
  claimed: boolean;
}>;

export type T1SessionClaim = Readonly<{
  internalNonce: string;
  task: "draft_review";
  profileId: "structure_support" | "wording_support";
  admissionSnapshot: string;
  consentPolicyVersion: string;
  consentNoticeVersion: string;
  consentEffectiveAt: string;
  previewHash: string;
  signal: AbortSignal;
}>;

export type T1SessionLookupResult =
  | { status: "ok"; claim: T1SessionClaim }
  | { status: "forbidden" }
  | { status: "gone" }
  | { status: "integrity_failure" };

export type T1SessionCreateResult = Readonly<{
  reviewToken: string;
  previewHash: string;
  expiresAt: string;
  replacedInternalNonce: string | null;
}>;

export class T1SessionCapacityError extends Error {
  constructor() {
    super("T1 transient session capacity is exhausted.");
  }
}

export class T1EphemeralSessionStore {
  private readonly sessions = new Map<string, StoredT1Session>();
  private readonly activeBySubject = new Map<string, string>();
  private readonly tombstones = new Map<string, number>();
  private readonly tokenKey = randomBytes(32);
  private readonly integrityKey = randomBytes(32);
  private totalMinimizedTextBytes = 0;
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly options: Readonly<{
      maxSessions?: number;
      maxMinimizedTextBytes?: number;
      ttlMs?: number;
      now?: () => number;
      monotonicNow?: () => number;
    }> = {}
  ) {
    const ttlMs = options.ttlMs ?? MAX_TTL_MS;
    const maxSessions = options.maxSessions ?? MAX_SESSIONS;
    const maxBytes = options.maxMinimizedTextBytes ?? MAX_MINIMIZED_TEXT_BYTES;
    if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0 || ttlMs > MAX_TTL_MS) {
      throw new RangeError("T1 session TTL exceeds the reviewed maximum.");
    }
    if (!Number.isSafeInteger(maxSessions) || maxSessions < 0 || maxSessions > MAX_SESSIONS) {
      throw new RangeError("T1 session count exceeds the reviewed maximum.");
    }
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 0 || maxBytes > MAX_MINIMIZED_TEXT_BYTES) {
      throw new RangeError("T1 minimized-text capacity exceeds the reviewed maximum.");
    }
  }

  private get now() {
    return this.options.now ?? Date.now;
  }

  private get monotonicNow() {
    return this.options.monotonicNow ?? (() => performance.now());
  }

  private get ttlMs() {
    return this.options.ttlMs ?? MAX_TTL_MS;
  }

  private hashToken(token: string) {
    return createHmac("sha256", this.tokenKey).update(token).digest("hex");
  }

  private hmac(value: string) {
    return createHmac("sha256", this.integrityKey).update(value).digest("hex");
  }

  private seal(session: Omit<StoredT1Session, "integritySeal" | "abortController" | "claimed">) {
    return this.hmac(
      [
        session.tokenHash,
        session.subject,
        session.internalNonce,
        session.task,
        session.profileId,
        session.admissionSnapshot,
        session.consentPolicyVersion,
        session.consentNoticeVersion,
        session.consentEffectiveAt,
        session.previewHash,
        String(session.minimizedTextBytes),
        String(session.expiresAtMs),
        String(session.expiresAtMonotonicMs)
      ].join("\0")
    );
  }

  private safeEqual(left: string, right: string) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  }

  private removeByHash(tokenHash: string, tombstone = true) {
    const session = this.sessions.get(tokenHash);
    if (!session) return null;
    session.abortController.abort();
    this.sessions.delete(tokenHash);
    if (this.activeBySubject.get(session.subject) === tokenHash) {
      this.activeBySubject.delete(session.subject);
    }
    this.totalMinimizedTextBytes = Math.max(
      0,
      this.totalMinimizedTextBytes - session.minimizedTextBytes
    );
    if (tombstone) this.tombstones.set(tokenHash, this.monotonicNow() + this.ttlMs);
    return session;
  }

  private scheduleExpiry() {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
    const deadlines = [
      ...[...this.sessions.values()].map((session) => session.expiresAtMonotonicMs),
      ...this.tombstones.values()
    ];
    if (deadlines.length === 0) return;
    const delay = Math.max(0, Math.min(...deadlines) - this.monotonicNow());
    this.expiryTimer = setTimeout(() => {
      this.expiryTimer = null;
      this.sweep();
    }, delay);
    this.expiryTimer.unref?.();
  }

  private sweep() {
    const now = this.monotonicNow();
    for (const [tokenHash, session] of this.sessions) {
      if (session.expiresAtMonotonicMs <= now) this.removeByHash(tokenHash);
    }
    for (const [tokenHash, expiresAt] of this.tombstones) {
      if (expiresAt <= now) this.tombstones.delete(tokenHash);
    }
    this.scheduleExpiry();
  }

  invalidateSubject(subject: string) {
    this.sweep();
    const tokenHash = this.activeBySubject.get(subject);
    if (!tokenHash) return null;
    const internalNonce = this.removeByHash(tokenHash)?.internalNonce ?? null;
    this.scheduleExpiry();
    return internalNonce;
  }

  create(input: T1SessionInput): T1SessionCreateResult {
    this.sweep();
    if (!Number.isSafeInteger(input.minimizedTextBytes) || input.minimizedTextBytes < 0) {
      throw new T1SessionCapacityError();
    }

    const existingTokenHash = this.activeBySubject.get(input.subject);
    const existingSession = existingTokenHash ? this.sessions.get(existingTokenHash) : undefined;
    const maxSessions = this.options.maxSessions ?? MAX_SESSIONS;
    const maxBytes = this.options.maxMinimizedTextBytes ?? MAX_MINIMIZED_TEXT_BYTES;
    const wallNow = this.now();
    const remainingMs = Math.min(this.ttlMs, input.expiresAtMs - wallNow);
    const projectedSessionCount = this.sessions.size - (existingSession ? 1 : 0) + 1;
    const projectedTextBytes =
      this.totalMinimizedTextBytes -
      (existingSession?.minimizedTextBytes ?? 0) +
      input.minimizedTextBytes;
    if (
      remainingMs <= 0 ||
      projectedSessionCount > maxSessions ||
      projectedTextBytes > maxBytes
    ) {
      throw new T1SessionCapacityError();
    }

    const replacedInternalNonce = existingTokenHash
      ? this.removeByHash(existingTokenHash)?.internalNonce ?? null
      : null;
    const reviewToken = `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
    const tokenHash = this.hashToken(reviewToken);
    const expiresAtMs = wallNow + remainingMs;
    const expiresAtMonotonicMs = this.monotonicNow() + remainingMs;
    const previewHash = `${PREVIEW_HASH_PREFIX}${this.hmac(
      `${tokenHash}\0${input.internalNonce}\0${input.redactedPreview}`
    )}`;
    const base = {
      tokenHash,
      subject: input.subject,
      internalNonce: input.internalNonce,
      task: input.task,
      profileId: input.profileId,
      admissionSnapshot: input.admissionSnapshot,
      consentPolicyVersion: input.consentPolicyVersion,
      consentNoticeVersion: input.consentNoticeVersion,
      consentEffectiveAt: input.consentEffectiveAt,
      previewHash,
      minimizedTextBytes: input.minimizedTextBytes,
      expiresAtMs,
      expiresAtMonotonicMs
    } as const;
    const session: StoredT1Session = Object.freeze({
      ...base,
      integritySeal: this.seal(base),
      abortController: new AbortController(),
      claimed: false
    });
    this.sessions.set(tokenHash, session);
    this.activeBySubject.set(input.subject, tokenHash);
    this.totalMinimizedTextBytes += input.minimizedTextBytes;
    this.scheduleExpiry();
    return {
      reviewToken,
      previewHash,
      expiresAt: new Date(expiresAtMs).toISOString(),
      replacedInternalNonce
    };
  }

  claim(reviewToken: string, subject: string): T1SessionLookupResult {
    this.sweep();
    const tokenHash = this.hashToken(reviewToken);
    const session = this.sessions.get(tokenHash);
    if (!session || session.claimed) return { status: "gone" };
    if (session.subject !== subject) return { status: "forbidden" };
    const { integritySeal: _seal, abortController: _controller, claimed: _claimed, ...base } = session;
    if (!this.safeEqual(session.integritySeal, this.seal(base))) {
      this.removeByHash(tokenHash);
      return { status: "integrity_failure" };
    }

    const claimed = Object.freeze({ ...session, claimed: true });
    this.sessions.set(tokenHash, claimed);
    return {
      status: "ok",
      claim: {
        internalNonce: claimed.internalNonce,
        task: claimed.task,
        profileId: claimed.profileId,
        admissionSnapshot: claimed.admissionSnapshot,
        consentPolicyVersion: claimed.consentPolicyVersion,
        consentNoticeVersion: claimed.consentNoticeVersion,
        consentEffectiveAt: claimed.consentEffectiveAt,
        previewHash: claimed.previewHash,
        signal: claimed.abortController.signal
      }
    };
  }

  consume(reviewToken: string) {
    this.sweep();
    const internalNonce = this.removeByHash(this.hashToken(reviewToken))?.internalNonce ?? null;
    this.scheduleExpiry();
    return internalNonce;
  }

  clear(reviewToken: string, subject: string) {
    this.sweep();
    const tokenHash = this.hashToken(reviewToken);
    const session = this.sessions.get(tokenHash);
    if (!session) return { status: "cleared" as const, internalNonce: null };
    if (session.subject !== subject) return { status: "forbidden" as const, internalNonce: null };
    const result = {
      status: "cleared" as const,
      internalNonce: this.removeByHash(tokenHash)?.internalNonce ?? null
    };
    this.scheduleExpiry();
    return result;
  }

  stats() {
    this.sweep();
    return Object.freeze({
      activeSessions: this.sessions.size,
      totalMinimizedTextBytes: this.totalMinimizedTextBytes
    });
  }

  dispose() {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
    for (const tokenHash of [...this.sessions.keys()]) this.removeByHash(tokenHash, false);
    this.tombstones.clear();
    this.tokenKey.fill(0);
    this.integrityKey.fill(0);
  }
}
