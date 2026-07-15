export const T1_USER_DRAFT_PURPOSE = "communication_analysis_user_draft" as const;
export const T1_POLICY_VERSION = "t1-policy-test-v1" as const;
export const T1_NOTICE_VERSION = "t1-notice-test-v1" as const;

export type T1ConsentStatus = "active" | "declined" | "withdrawn";

export type T1PurposeConsentRecord = Readonly<{
  subject: string;
  purpose: typeof T1_USER_DRAFT_PURPOSE;
  policyVersion: string;
  noticeVersion: string;
  status: T1ConsentStatus;
  decidedAt: string;
  effectiveAt: string;
  sourceSurface: string;
  withdrawnAt: string | null;
}>;

export type T1ConsentWithdrawalListener = (subject: string) => void | Promise<void>;

export interface T1PurposeConsentProvider {
  getConsent(subject: string, purpose: typeof T1_USER_DRAFT_PURPOSE): Promise<T1PurposeConsentRecord | null>;
  onWithdrawal(listener: T1ConsentWithdrawalListener): () => void;
}

export class UnavailableT1PurposeConsentProvider implements T1PurposeConsentProvider {
  async getConsent() {
    return null;
  }

  onWithdrawal(_listener: T1ConsentWithdrawalListener) {
    return () => undefined;
  }
}

/** In-memory consent authority for fictional protocol tests only. */
export class TestOnlyT1PurposeConsentProvider implements T1PurposeConsentProvider {
  private readonly records = new Map<string, T1PurposeConsentRecord>();
  private readonly listeners = new Set<T1ConsentWithdrawalListener>();

  constructor(environment: { APP_ENV?: string; NODE_ENV?: string } = process.env) {
    if (environment.APP_ENV !== "test" || environment.NODE_ENV !== "test") {
      throw new Error("The test consent provider cannot load outside tests.");
    }
  }

  async getConsent(subject: string, purpose: typeof T1_USER_DRAFT_PURPOSE) {
    const record = this.records.get(subject) ?? null;
    return record?.purpose === purpose ? record : null;
  }

  onWithdrawal(listener: T1ConsentWithdrawalListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  grant(subject: string, overrides: Partial<T1PurposeConsentRecord> = {}) {
    const now = new Date().toISOString();
    const record: T1PurposeConsentRecord = Object.freeze({
      subject,
      purpose: T1_USER_DRAFT_PURPOSE,
      policyVersion: T1_POLICY_VERSION,
      noticeVersion: T1_NOTICE_VERSION,
      status: "active",
      decidedAt: now,
      effectiveAt: now,
      sourceSurface: "fictional-protocol-test",
      withdrawnAt: null,
      ...overrides
    });
    this.records.set(subject, record);
    return record;
  }

  async withdraw(subject: string) {
    const current = this.records.get(subject);
    if (current) {
      const now = new Date().toISOString();
      this.records.set(subject, Object.freeze({ ...current, status: "withdrawn", withdrawnAt: now }));
    }
    await Promise.all([...this.listeners].map((listener) => listener(subject)));
  }
}

export function isActiveT1Consent(record: T1PurposeConsentRecord | null, subject: string) {
  return Boolean(
    record &&
      record.subject === subject &&
      record.purpose === T1_USER_DRAFT_PURPOSE &&
      record.policyVersion === T1_POLICY_VERSION &&
      record.noticeVersion === T1_NOTICE_VERSION &&
      record.status === "active" &&
      record.withdrawnAt === null
  );
}
