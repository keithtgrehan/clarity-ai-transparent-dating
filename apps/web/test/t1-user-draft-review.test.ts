import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type { T1UserDraftPrepareResponse } from "@clarity/shared";
import {
  createInitialT1UserDraftReviewState,
  isT1UserDraftUiEnabled,
  t1UserDraftReviewReducer
} from "../src/pages/t1UserDraftReviewModel.ts";

const fictionalPreparation = {
  schemaVersion: "2.0.0",
  reviewToken: `rt_${"a".repeat(43)}`,
  expiresAt: "2030-01-01T00:00:00.000Z",
  redactedPreview: "A fictional [PERSON] suggested a quiet cafe.",
  potentialIdentifierCounts: {
    person_name: 1,
    location: 0,
    contact: 0,
    online_handle: 0,
    identifier: 0,
    other: 0
  },
  detectorVersion: `dv_${"b".repeat(64)}`,
  previewHash: `ph_${"c".repeat(64)}`,
  limitation:
    "Potential identifiers detected by this tool were masked. Indirect or contextual identifiers may remain."
} as const satisfies T1UserDraftPrepareResponse;

test("T1 UI requires both development-only gates", () => {
  assert.equal(isT1UserDraftUiEnabled("true", "true", true), true);
  assert.equal(isT1UserDraftUiEnabled("true", "false", true), false);
  assert.equal(isT1UserDraftUiEnabled("false", "true", true), false);
  assert.equal(isT1UserDraftUiEnabled("true", "true", false), false);
  assert.equal(isT1UserDraftUiEnabled(undefined, undefined, true), false);
});

test("editing invalidates a prepared review and stale completion is ignored", () => {
  let state = createInitialT1UserDraftReviewState();
  state = t1UserDraftReviewReducer(state, {
    type: "confirm_self_authored",
    value: true,
    revision: 1
  });
  state = t1UserDraftReviewReducer(state, { type: "prepare_start", revision: 2 });
  state = t1UserDraftReviewReducer(state, {
    type: "prepare_succeed",
    value: fictionalPreparation,
    revision: 2
  });
  assert.equal(state.phase, "review");
  assert.equal(state.draft, "");

  state = t1UserDraftReviewReducer(state, {
    type: "edit_draft",
    value: "A revised fictional draft.",
    revision: 3
  });
  assert.equal(state.phase, "draft");
  assert.equal(state.preparation, null);

  const unchanged = t1UserDraftReviewReducer(state, {
    type: "prepare_succeed",
    value: fictionalPreparation,
    revision: 2
  });
  assert.deepEqual(unchanged, state);
});

test("clear and expiry remove all draft and review state", () => {
  const initial = createInitialT1UserDraftReviewState();
  const cleared = t1UserDraftReviewReducer(initial, { type: "clear", revision: 1 });
  const expired = t1UserDraftReviewReducer(initial, { type: "expire", revision: 1 });

  for (const state of [cleared, expired]) {
    assert.equal(state.draft, "");
    assert.equal(state.preparation, null);
    assert.equal(state.analysis, null);
    assert.equal(state.selfAuthoredConfirmed, false);
  }
});

test("scaffold has no browser persistence or URL text transport", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../src/pages/T1UserDraftReviewPage.tsx", import.meta.url)),
    "utf8"
  );
  const apiSource = await readFile(
    fileURLToPath(new URL("../src/lib/t1UserDraftApi.ts", import.meta.url)),
    "utf8"
  );

  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.doesNotMatch(apiSource, /URLSearchParams|location\.search/);
  assert.match(source, /redactedReviewConfirmed/);
  assert.match(source, /autoComplete="off"/);
  assert.match(source, /aria-live="polite"/);
});
