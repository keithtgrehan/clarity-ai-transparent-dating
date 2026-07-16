export type T1PrivacyAdmissionState = Readonly<{
  admitted: boolean;
  snapshot: string;
}>;

export interface T1PrivacyAdmissionProvider {
  current(): Promise<T1PrivacyAdmissionState>;
}

export class UnavailableT1PrivacyAdmissionProvider implements T1PrivacyAdmissionProvider {
  async current(): Promise<T1PrivacyAdmissionState> {
    return { admitted: false, snapshot: "unavailable" };
  }
}

export class TestOnlyT1PrivacyAdmissionProvider implements T1PrivacyAdmissionProvider {
  private state: T1PrivacyAdmissionState;

  constructor(
    snapshot = `pa_${"0".repeat(64)}`,
    environment: { APP_ENV?: string; NODE_ENV?: string } = process.env
  ) {
    if (environment.APP_ENV !== "test" || environment.NODE_ENV !== "test") {
      throw new Error("The test privacy admission cannot load outside tests.");
    }
    this.state = Object.freeze({ admitted: true, snapshot });
  }

  async current() {
    return this.state;
  }

  setState(state: T1PrivacyAdmissionState) {
    this.state = Object.freeze({ ...state });
  }
}
