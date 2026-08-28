import assert from "node:assert/strict";
import test from "node:test";
import { scenarios } from "../core/scenarios.mjs";
import { runBaseline, runFaultline } from "../core/replay-agent.mjs";

test("ships at least ten evaluation cases with a challenging case", () => {
  assert.ok(scenarios.length >= 10);
  assert.ok(scenarios.some((scenario) => scenario.gold.fault === "regional_packet_loss"));
});

test("never recommends an action outside the incident action catalog", () => {
  for (const scenario of scenarios) {
    const result = runFaultline(scenario);
    assert.ok(result.action === null || scenario.allowedActions.includes(result.action));
  }
});

test("preserves a complete inspectable trajectory", () => {
  const result = runFaultline(scenarios[0]);
  assert.deepEqual(result.trajectory.map((item) => item.action), [
    "inventory_fault_surface",
    "open_competing_hypotheses",
    "inspect_recent_changes",
    "query_logs",
    "inspect_trace_path",
    "falsify_leading_hypothesis",
    "validate_recovery_action",
  ]);
});

test("advanced replay improves over the simple baseline", () => {
  const baselineCorrect = scenarios.filter((scenario) => runBaseline(scenario).service === scenario.gold.service).length;
  const faultlineCorrect = scenarios.filter((scenario) => runFaultline(scenario).service === scenario.gold.service).length;
  assert.ok(faultlineCorrect > baselineCorrect, `${faultlineCorrect} should exceed ${baselineCorrect}`);
});

