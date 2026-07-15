const PROHIBITED_SIGNAL_FLAGS = [
  "SIGNAL_ENGINE_USER_AUTHORED_TEXT",
  "SIGNAL_ENGINE_RECEIVED_EXCERPTS",
  "SIGNAL_ENGINE_AUDIO",
  "SIGNAL_ENGINE_SYNTHETIC_TRAINING",
  "SIGNAL_ENGINE_REAL_DATA_TRAINING",
  "SIGNAL_ENGINE_PRODUCTION"
] as const;

type SignalFlagName =
  | "SIGNAL_ENGINE_ENABLED"
  | "SIGNAL_ENGINE_SYNTHETIC_ONLY"
  | (typeof PROHIBITED_SIGNAL_FLAGS)[number];

export type SignalEngineSettings = {
  enabled: boolean;
  syntheticOnly: boolean;
  internalUrl: string | null;
  internalSecret: string | null;
  timeoutMs: number;
  rateLimitMax: number;
  rateLimitWindowMs: number;
};

function readBoolean(environment: NodeJS.ProcessEnv, name: SignalFlagName) {
  const value = environment[name];
  if (value === undefined || value === "") return false;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be exactly true or false.`);
}

function readPositiveInteger(
  environment: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  maximum: number
) {
  const raw = environment[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0 || value > maximum) {
    throw new Error(`${name} must be a positive integer no greater than ${maximum}.`);
  }
  return value;
}

function validateLoopbackUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  const loopbackHosts = new Set(["127.0.0.1", "[::1]"]);
  if (!loopbackHosts.has(url.hostname) || !["http:", "https:"].includes(url.protocol)) {
    throw new Error("SIGNAL_ENGINE_INTERNAL_URL must use an explicit loopback address.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("SIGNAL_ENGINE_INTERNAL_URL cannot contain credentials, a query, or a fragment.");
  }
  if (url.pathname !== "/") {
    throw new Error("SIGNAL_ENGINE_INTERNAL_URL must not contain an application path.");
  }
  return url.toString().replace(/\/$/, "");
}

export function readSignalEngineSettings(
  environment: NodeJS.ProcessEnv = process.env
): SignalEngineSettings {
  const enabled = readBoolean(environment, "SIGNAL_ENGINE_ENABLED");
  const syntheticOnly = readBoolean(environment, "SIGNAL_ENGINE_SYNTHETIC_ONLY");
  const prohibited = PROHIBITED_SIGNAL_FLAGS.filter((name) => readBoolean(environment, name));

  if (prohibited.length > 0) {
    throw new Error(`Prohibited signal-engine gates are enabled: ${prohibited.join(", ")}.`);
  }
  if (enabled && !syntheticOnly) {
    throw new Error("The signal engine can only run with SIGNAL_ENGINE_SYNTHETIC_ONLY=true.");
  }
  if (enabled && !["local", "test"].includes(environment.APP_ENV ?? "")) {
    throw new Error("The signal engine is restricted to explicit local or test environments.");
  }

  const configuredUrl = environment.SIGNAL_ENGINE_INTERNAL_URL?.trim() || null;
  const configuredSecret = environment.SIGNAL_ENGINE_INTERNAL_SECRET?.trim() || null;
  const internalUrl = configuredUrl ? validateLoopbackUrl(configuredUrl) : null;

  if (enabled && (!internalUrl || !configuredSecret || configuredSecret.length < 32)) {
    throw new Error(
      "Enabled signal-engine review requires a loopback URL and an internal secret of at least 32 characters."
    );
  }

  return {
    enabled,
    syntheticOnly,
    internalUrl,
    internalSecret: configuredSecret,
    timeoutMs: readPositiveInteger(environment, "SIGNAL_ENGINE_TIMEOUT_MS", 5_000, 15_000),
    rateLimitMax: readPositiveInteger(environment, "SIGNAL_ENGINE_RATE_LIMIT_MAX", 10, 100),
    rateLimitWindowMs: readPositiveInteger(
      environment,
      "SIGNAL_ENGINE_RATE_LIMIT_WINDOW_MS",
      60_000,
      600_000
    )
  };
}

export function resolveApiListenHostForSignalReview(settings: SignalEngineSettings) {
  return settings.enabled ? "127.0.0.1" : "0.0.0.0";
}
