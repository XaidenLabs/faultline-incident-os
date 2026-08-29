import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships the animated Faultline product and command center instead of starter content", async () => {
  const [page, dashboard, incidentsApi, investigateApi, layout, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/incidents/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/investigate/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Incidents don’t need another explanation/);
  assert.doesNotMatch(page, /FaultlineScene|three/);
  assert.match(page, /gsap/);
  assert.match(dashboard, /AUTONOMOUS REPLAY/);
  assert.match(dashboard, /investigateIncident\(selectedId, false/);
  assert.match(dashboard, />Re-run</);
  assert.match(dashboard, /RECOVERY PLAN/);
  assert.match(dashboard, /RUNBOOK MEMORY/);
  assert.match(dashboard, /fetch\("\/api\/incidents"/);
  assert.match(dashboard, /fetch\("\/api\/investigate"/);
  assert.match(dashboard, /drawer-toggle/);
  assert.match(dashboard, /selected\.candidates/);
  assert.match(dashboard, /SignalChart/);
  assert.doesNotMatch(dashboard, /Regional packet loss|19\.0%|INC-2492/);
  assert.match(incidentsApi, /scenarios/);
  assert.match(investigateApi, /runIncidentOS/);
  assert.match(css, /@media \(max-width: 1280px\)/);
  assert.match(css, /drawer-open/);
  assert.match(layout, /Counterfactual incident intelligence/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
});
