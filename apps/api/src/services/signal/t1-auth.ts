import type { FastifyRequest } from "fastify";

export type T1AuthenticationContext = Readonly<{
  subject: string;
  providerId: string;
  authenticatedAt: string;
}>;

export interface T1AuthenticationProvider {
  readonly providerId: string;
  authenticate(request: FastifyRequest): Promise<T1AuthenticationContext | null>;
}

export class UnavailableT1AuthenticationProvider implements T1AuthenticationProvider {
  readonly providerId = "unavailable";

  async authenticate(_request: FastifyRequest) {
    return null;
  }
}

/** Fixed identity for an explicitly enabled loopback-only development review. */
export class FixedLocalT1AuthenticationProvider implements T1AuthenticationProvider {
  readonly providerId = "fixed-local-bypass";

  constructor(
    environment: string,
    explicitlyEnabled: boolean
  ) {
    if (environment !== "local" || !explicitlyEnabled) {
      throw new Error("Fixed local authentication is unavailable outside an explicit local review.");
    }
  }

  async authenticate(_request: FastifyRequest): Promise<T1AuthenticationContext> {
    return {
      subject: "local-synthetic-t1-reviewer",
      providerId: this.providerId,
      authenticatedAt: new Date().toISOString()
    };
  }
}

/** Explicit test-only provider; request fields never choose the subject. */
export class TestOnlyT1AuthenticationProvider implements T1AuthenticationProvider {
  readonly providerId = "test-only-fixed-auth";

  constructor(
    private readonly subject: string,
    environment: { APP_ENV?: string; NODE_ENV?: string } = process.env
  ) {
    if (environment.APP_ENV !== "test" || environment.NODE_ENV !== "test") {
      throw new Error("The test authentication provider cannot load outside tests.");
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{2,127}$/.test(subject)) {
      throw new Error("The test subject must use the bounded opaque-subject format.");
    }
  }

  async authenticate(_request: FastifyRequest): Promise<T1AuthenticationContext> {
    return {
      subject: this.subject,
      providerId: this.providerId,
      authenticatedAt: new Date().toISOString()
    };
  }
}
