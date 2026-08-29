import assert from "node:assert/strict";
import test from "node:test";
import { scenarios } from "../core/scenarios.mjs";
import { runBaseline, runFaultline } from "../core/replay-agent.mjs";
import { createIncidentSandbox } from "../core/sandbox.mjs";
import { executeTool } from "../core/live-agent.mjs";
import { publicScenario } from "../core/scenarios.mjs";
import { renderIncidentReport, runIncidentOS } from "../core/incident-os.mjs";

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
    "snapshot_incident_state",
    "run_counterfactual",
    "verify_causal_proof",
    "validate_recovery_action",
  ]);
});

test("a plausible but wrong intervention does not clear the hard incident", () => {
  const hardCase = scenarios.find((scenario) => scenario.id === "INC-2492");
  const sandbox = createIncidentSandbox(hardCase);
  const wrong = sandbox.runCounterfactual("checkout:rollback-canary");
  assert.equal(wrong.verdict, "rejected");
  assert.equal(wrong.effect.symptomCleared, false);
  assert.equal(wrong.productionConnected, false);
});

test("the causal intervention clears the hard incident without side effects", () => {
  const hardCase = scenarios.find((scenario) => scenario.id === "INC-2492");
  const sandbox = createIncidentSandbox(hardCase);
  const proof = sandbox.runCounterfactual("network:reroute-zone");
  assert.equal(proof.verdict, "causal");
  assert.equal(proof.effect.symptomCleared, true);
  assert.equal(proof.effect.unrelatedRegressions, 0);
});

test("the live tool adapter exposes the same isolated counterfactual contract", () => {
  const scenario = scenarios[0];
  const output = executeTool(
    "run_counterfactual",
    { action: scenario.gold.action },
    publicScenario(scenario),
    createIncidentSandbox(scenario),
  );
  assert.equal(output.verdict, "causal");
  assert.equal(output.productionConnected, false);
});

test("Faultline rejects the local-change bait and proves the shared network cause", () => {
  const hardCase = scenarios.find((scenario) => scenario.id === "INC-2492");
  const result = runFaultline(hardCase);
  assert.equal(result.service, "network");
  assert.equal(result.action, "network:reroute-zone");
  assert.equal(result.causalProof, true);
  assert.deepEqual(result.experiments.map((item) => item.verdict), ["rejected", "causal"]);
});

test("advanced replay improves over the simple baseline", () => {
  const baselineCorrect = scenarios.filter((scenario) => runBaseline(scenario).service === scenario.gold.service).length;
  const faultlineCorrect = scenarios.filter((scenario) => runFaultline(scenario).service === scenario.gold.service).length;
  assert.ok(faultlineCorrect > baselineCorrect, `${faultlineCorrect} should exceed ${baselineCorrect}`);
});

test("the full incident lifecycle closes with inspectable operational artifacts", () => {
  const pkg = runIncidentOS(scenarios[0], { now: "2026-08-29T00:00:00.000Z" });
  assert.deepEqual(pkg.lifecycle, {
    observe: "normalized",
    investigate: "complete",
    prove: "passed",
    rehearse: "passed",
    approve: "awaiting-human",
    learn: "compiled",
  });
  assert.equal(pkg.recovery.constraints.productionExecuted, false);
  assert.equal(pkg.rehearsal.healthGates.every((gate) => gate.passed), true);
  assert.equal(pkg.runbook.recover.autoExecute, false);
  assert.match(pkg.audit.sha256, /^[a-f0-9]{64}$/);
});

test("the incident report turns a failed experiment into retained learning", () => {
  const hardCase = scenarios.find((scenario) => scenario.id === "INC-2492");
  const pkg = runIncidentOS(hardCase, { now: "2026-08-29T00:00:00.000Z" });
  const report = renderIncidentReport(pkg);
  assert.deepEqual(pkg.postmortem.alternativesRejected.map((item) => item.service), ["checkout"]);
  assert.match(report, /Rejected alternatives: checkout/);
  assert.match(report, /Reusable runbook/);
});
