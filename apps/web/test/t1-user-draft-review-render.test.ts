import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { afterEach } from "node:test";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import React from "react";

const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
  url: "http://localhost/"
});
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  HTMLInputElement: dom.window.HTMLInputElement,
  MutationObserver: dom.window.MutationObserver,
  Event: dom.window.Event,
  MouseEvent: dom.window.MouseEvent,
  KeyboardEvent: dom.window.KeyboardEvent,
  getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
  IS_REACT_ACT_ENVIRONMENT: true
});
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: dom.window.navigator
});

const { cleanup, render, waitFor } = await import("@testing-library/react");
const { default: userEvent } = await import("@testing-library/user-event");
const { T1UserDraftReviewPage } = await import("../src/pages/T1UserDraftReviewPage.tsx");

const REVIEW_TOKEN = `rt_${"a".repeat(43)}`;

function prepareResponse(expiresAt = new Date(Date.now() + 60_000).toISOString()) {
  return {
    schemaVersion: "2.0.0",
    reviewToken: REVIEW_TOKEN,
    expiresAt,
    redactedPreview: "A wholly fictional [PERSON] suggested a quiet cafe.",
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
  };
}

function response(body: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: status === 204 ? undefined : { "Content-Type": "application/json" }
  });
}

afterEach(() => {
  cleanup();
  document.head.replaceChildren();
  document.body.replaceChildren();
});

test("keyboard order, live preparation status and focus transfer are executable", async () => {
  let releasePrepare!: () => void;
  const preparationGate = new Promise<void>((resolve) => {
    releasePrepare = resolve;
  });
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/prepare")) {
      await preparationGate;
      return response(prepareResponse());
    }
    if (url.endsWith("/clear")) return response(null, 204);
    throw new Error("Unexpected synthetic UI request");
  };

  const view = render(React.createElement(T1UserDraftReviewPage));
  const user = userEvent.setup({ document });

  await user.tab();
  assert.equal(document.activeElement?.id, "t1-draft-profile");
  await user.tab();
  assert.equal(document.activeElement?.id, "t1-draft-language");
  await user.tab();
  assert.equal(document.activeElement?.id, "t1-fictional-draft");
  await user.tab();
  const selfAuthored = view.getByRole("checkbox", { name: /I wrote this fictional test draft/i });
  assert.equal(document.activeElement, selfAuthored);
  await user.keyboard(" ");
  assert.equal((selfAuthored as HTMLInputElement).checked, true);
  await user.tab();
  const prepare = view.getByRole("button", { name: "Prepare privacy review" });
  assert.equal(document.activeElement, prepare);
  await user.keyboard("{Enter}");

  const liveRegion = view.container.querySelector('[aria-live="polite"]');
  await waitFor(() =>
    assert.match(liveRegion?.textContent ?? "", /Replacing potential identifiers/i)
  );
  releasePrepare();

  const previewHeading = await view.findByRole("heading", { name: "Check the minimised preview" });
  await waitFor(() => assert.equal(document.activeElement, previewHeading));
});

test("an ambiguous continue error attempts clear and exposes a focused alert summary", async () => {
  const requests: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    requests.push(url);
    if (url.endsWith("/prepare")) return response(prepareResponse());
    if (url.endsWith("/continue")) return response({ error: "unavailable" }, 503);
    if (url.endsWith("/clear")) return response(null, 204);
    throw new Error("Unexpected synthetic UI request");
  };

  const view = render(React.createElement(T1UserDraftReviewPage));
  const user = userEvent.setup({ document });
  await user.click(view.getByRole("checkbox", { name: /I wrote this fictional test draft/i }));
  await user.click(view.getByRole("button", { name: "Prepare privacy review" }));
  await view.findByRole("heading", { name: "Check the minimised preview" });
  await user.click(
    view.getByRole("checkbox", { name: /I reviewed this minimised preview/i })
  );
  await user.click(view.getByRole("button", { name: "Continue with minimised text" }));

  const alert = await view.findByRole("alert");
  const heading = view.getByRole("heading", { name: "Review unavailable" });
  assert.match(alert.textContent ?? "", /could not continue/i);
  await waitFor(() => assert.equal(document.activeElement, heading));
  await waitFor(() =>
    assert.equal(requests.filter((url) => url.endsWith("/clear")).length, 1)
  );
});

test("the visible expiry timer clears the review and restores draft focus", async () => {
  const requests: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    requests.push(url);
    if (url.endsWith("/prepare")) {
      return response(prepareResponse(new Date(Date.now() + 200).toISOString()));
    }
    if (url.endsWith("/clear")) return response(null, 204);
    throw new Error("Unexpected synthetic UI request");
  };

  const view = render(React.createElement(T1UserDraftReviewPage));
  const user = userEvent.setup({ document });
  await user.click(view.getByRole("checkbox", { name: /I wrote this fictional test draft/i }));
  await user.click(view.getByRole("button", { name: "Prepare privacy review" }));
  await view.findByRole("heading", { name: "Check the minimised preview" });

  const expired = await view.findByRole("heading", {
    name: "Review expired and cleared"
  });
  assert.equal(expired.closest('[aria-live="polite"]') !== null, true);
  await waitFor(() => assert.equal(document.activeElement?.id, "t1-fictional-draft"));
  await waitFor(() =>
    assert.equal(requests.filter((url) => url.endsWith("/clear")).length, 1)
  );
});

test("the shipped stylesheet contains executable reduced-motion and responsive policies", async () => {
  const css = await readFile(
    fileURLToPath(new URL("../src/styles/global.css", import.meta.url)),
    "utf8"
  );
  const style = document.createElement("style");
  style.textContent = css;
  document.head.append(style);
  const rules = Array.from(style.sheet?.cssRules ?? []);
  const reducedMotion = rules.find((rule) =>
    rule.cssText.includes("prefers-reduced-motion: reduce")
  );
  const tabletLayout = rules.find((rule) => rule.cssText.includes("max-width: 1080px"));
  const phoneLayout = rules.find((rule) => rule.cssText.includes("max-width: 720px"));

  assert.ok(reducedMotion, "reduced-motion policy must parse as a CSS rule");
  assert.match(reducedMotion.cssText, /transition-duration:\s*0\.01ms\s*!important/i);
  assert.match(reducedMotion.cssText, /animation-iteration-count:\s*1\s*!important/i);
  assert.ok(tabletLayout, "tablet policy must parse as a CSS rule");
  assert.match(tabletLayout.cssText, /\.two-columns[\s\S]*grid-template-columns:\s*1fr/i);
  assert.ok(phoneLayout, "phone policy must parse as a CSS rule");
  assert.match(phoneLayout.cssText, /\.action-row[\s\S]*flex-direction:\s*column/i);
});
