import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships the animated Faultline product and command center instead of starter content", async () => {
  const [page, dashboard, layout, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Incidents don’t need another explanation/);
  assert.match(page, /FaultlineScene/);
  assert.match(page, /gsap/);
  assert.match(dashboard, /Run investigation/);
  assert.match(dashboard, /RECOVERY LAB/);
  assert.match(dashboard, /RUNBOOK MEMORY/);
  assert.match(layout, /Counterfactual incident intelligence/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
});
