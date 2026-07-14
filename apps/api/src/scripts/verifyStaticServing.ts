import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp } from "../app.js";
import { resolveRepoPath } from "../lib/paths.js";

type ClarityApp = Awaited<ReturnType<typeof buildApp>>;
type InjectionResponse = Awaited<ReturnType<ClarityApp["inject"]>>;

const environmentKeys = ["API_STORAGE_FILE", "SERVE_WEB", "APP_ENV", "API_ALLOWED_ORIGIN"] as const;
const previousEnvironment = Object.fromEntries(
  environmentKeys.map((key) => [key, process.env[key]])
) as Record<(typeof environmentKeys)[number], string | undefined>;

const temporaryDirectory = await mkdtemp(join(tmpdir(), "clarity-static-check-"));
const allowedOrigin = "http://localhost:5173";
let app: ClarityApp | undefined;

try {
  process.env.API_STORAGE_FILE = join(temporaryDirectory, "store.json");
  process.env.SERVE_WEB = "true";
  process.env.APP_ENV = "local";
  process.env.API_ALLOWED_ORIGIN = allowedOrigin;

  const indexHtml = await readFile(resolveRepoPath("apps/web/dist/index.html"), "utf8");
  assert.match(indexHtml, /id=["']root["']/);

  app = await buildApp({ logger: false });

  for (const url of ["/", "/matches"]) {
    const response: InjectionResponse = await app.inject({ method: "GET", url });
    assert.equal(response.statusCode, 200, `${url} should return the SPA shell`);
    assert.match(response.headers["content-type"] ?? "", /^text\/html/);
    assert.match(response.body, /id=["']root["']/);
  }

  const assetPaths = [...indexHtml.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g)].map(
    (match) => match[1]
  );
  assert.ok(assetPaths.length > 0, "built index should reference at least one JS or CSS asset");

  for (const assetPath of assetPaths) {
    const response: InjectionResponse = await app.inject({ method: "GET", url: assetPath });
    assert.equal(response.statusCode, 200, `${assetPath} should be served from built web output`);
    assert.match(response.headers["content-type"] ?? "", /(javascript|css)/);
  }

  const missingApiRoute = await app.inject({ method: "GET", url: "/api/does-not-exist" });
  assert.equal(missingApiRoute.statusCode, 404);
  assert.deepEqual(missingApiRoute.json(), { error: "Route not found." });
  assert.match(missingApiRoute.headers["content-type"] ?? "", /^application\/json/);

  const missingAsset = await app.inject({ method: "GET", url: "/missing.js" });
  assert.equal(missingAsset.statusCode, 404);
  assert.deepEqual(missingAsset.json(), { error: "Route not found." });

  const allowedCors = await app.inject({
    method: "GET",
    url: "/health",
    headers: { origin: allowedOrigin }
  });
  assert.equal(allowedCors.headers["access-control-allow-origin"], allowedOrigin);

  const deniedCors = await app.inject({
    method: "GET",
    url: "/health",
    headers: { origin: "https://untrusted.invalid" }
  });
  assert.equal(deniedCors.headers["access-control-allow-origin"], undefined);

  console.log(
    `Static serving verified: ${assetPaths.length} asset(s), SPA fallback, API 404, and CORS allowlist.`
  );
} finally {
  if (app) await app.close();
  await rm(temporaryDirectory, { recursive: true, force: true });

  for (const key of environmentKeys) {
    const previous = previousEnvironment[key];
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  }
}
