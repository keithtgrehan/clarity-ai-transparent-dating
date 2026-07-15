import {
  CommunicationAnalysisRequestSchema,
  CommunicationAnalysisResponseSchema,
  type CommunicationAnalysisRequest
} from "@clarity/shared";
import type { FastifyInstance } from "fastify";
import { resolveSyntheticSignalFixture } from "../services/signal/fixtures.js";
import type { SignalEngineSettings } from "../services/signal/settings.js";

const MAX_RESPONSE_BYTES = 64 * 1024;

export type SignalFetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

export type SignalAnalysisRouteOptions = {
  settings: SignalEngineSettings;
  fetchImpl?: SignalFetch;
};

function createGlobalMemoryRateLimit(maximum: number, windowMs: number) {
  let windowStartedAt = Date.now();
  let count = 0;

  return () => {
    const now = Date.now();
    if (now - windowStartedAt >= windowMs) {
      windowStartedAt = now;
      count = 0;
    }
    count += 1;
    return count <= maximum;
  };
}

async function readBoundedResponse(response: Response) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error("Upstream response exceeds the private adapter limit.");
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let byteCount = 0;
  let decoded = "";

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    byteCount += chunk.value.byteLength;
    if (byteCount > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("Upstream response exceeds the private adapter limit.");
    }
    decoded += decoder.decode(chunk.value, { stream: true });
  }
  return decoded + decoder.decode();
}

function toInternalRequest(
  request: CommunicationAnalysisRequest,
  fixture: ReturnType<typeof resolveSyntheticSignalFixture>
) {
  return {
    fixture_id: fixture.id,
    task: request.task,
    profile_id: request.profileId,
    text: fixture.text,
    language_tag: fixture.languageTag,
    authority: {
      source_class: "synthetic_fixture",
      review_confirmed: true
    }
  };
}

export async function registerSignalAnalysisRoutes(
  app: FastifyInstance,
  options: SignalAnalysisRouteOptions
) {
  if (!options.settings.enabled) return;

  const fetchImpl = options.fetchImpl ?? fetch;
  const withinRateLimit = createGlobalMemoryRateLimit(
    options.settings.rateLimitMax,
    options.settings.rateLimitWindowMs
  );

  app.post(
    "/communication-analysis/text",
    {
      bodyLimit: 2_048,
      logLevel: "silent",
      onSend: async (_request, reply, payload) => {
        reply.header("Cache-Control", "no-store");
        reply.header("Pragma", "no-cache");
        return payload;
      }
    },
    async (request, reply) => {
      if (!withinRateLimit()) {
        return reply.status(429).send({ error: "Synthetic analysis rate limit reached." });
      }

      const parsedRequest = CommunicationAnalysisRequestSchema.safeParse(request.body);
      if (!parsedRequest.success) {
        return reply.status(400).send({ error: "Invalid synthetic analysis request." });
      }

      const fixture = resolveSyntheticSignalFixture(parsedRequest.data.fixtureId);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.settings.timeoutMs);

      try {
        const upstream = await fetchImpl(
          `${options.settings.internalUrl}/internal/v1/communication-analysis/text`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Internal-Service-Secret": options.settings.internalSecret ?? ""
            },
            body: JSON.stringify(toInternalRequest(parsedRequest.data, fixture)),
            redirect: "error",
            signal: controller.signal
          }
        );

        if (
          !upstream.ok ||
          !(upstream.headers.get("content-type") ?? "").toLowerCase().includes("application/json")
        ) {
          return reply.status(503).send({ error: "Synthetic analysis is temporarily unavailable." });
        }

        const rawResponse = await readBoundedResponse(upstream);

        let decoded: unknown;
        try {
          decoded = JSON.parse(rawResponse);
        } catch {
          return reply.status(503).send({ error: "Synthetic analysis is temporarily unavailable." });
        }

        const analysis = CommunicationAnalysisResponseSchema.safeParse(decoded);
        if (!analysis.success) {
          return reply.status(503).send({ error: "Synthetic analysis is temporarily unavailable." });
        }

        return reply.status(200).send(analysis.data);
      } catch {
        return reply.status(503).send({ error: "Synthetic analysis is temporarily unavailable." });
      } finally {
        clearTimeout(timeout);
      }
    }
  );
}
