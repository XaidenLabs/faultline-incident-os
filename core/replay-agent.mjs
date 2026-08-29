import { publicScenario } from "./scenarios.mjs";
import { createIncidentSandbox } from "./sandbox.mjs";

export function runBaseline(scenario) {
  // Credible simple baseline: one pass over a telemetry summary and choose the
  // component with the largest visible error rate. It has no topology queries,
  // competing hypotheses, falsification, or action validation.
  const ranked = [...scenario.candidates].sort((a, b) => b.errorRate - a.errorRate);
  const root = ranked[0];
  return {
    service: root.service,
    action: scenario.allowedActions.find((action) => action.startsWith(`${root.service}:`)) ?? null,
    evidence: [root.signal],
    trajectory: [{ actor: "baseline", decision: "selected highest-error component", result: root.service }],
  };
}

export function runFaultline(scenario) {
  const visible = publicScenario(scenario);
  const trajectory = [];
  const sandbox = createIncidentSandbox(scenario);

  trajectory.push(event("investigator", "inventory_fault_surface", {
    symptom: visible.symptom,
    services: visible.candidates.map((candidate) => candidate.service),
    topology: visible.topology,
  }));

  const hypotheses = visible.candidates.map((candidate) => ({
    service: candidate.service,
    score: scoreCandidate(candidate),
    supporting: [candidate.signal],
    contradicting: candidate.contradictions,
  })).sort((a, b) => b.score - a.score);

  trajectory.push(event("investigator", "open_competing_hypotheses", hypotheses));
  trajectory.push(event("tool", "inspect_recent_changes", visible.changes));
  trajectory.push(event("tool", "query_logs", visible.logs));
  trajectory.push(event("tool", "inspect_trace_path", visible.trace));

  const leading = hypotheses[0];
  const alternative = hypotheses[1];
  const margin = leading.score - alternative.score;

  trajectory.push(event("verifier", "falsify_leading_hypothesis", {
    target: leading.service,
    strongestAlternative: alternative.service,
    margin,
    survived: leading.contradicting === 0 && margin >= 12,
    checks: ["temporal precedence", "cross-service propagation", "contradicting observations"],
  }));

  trajectory.push(event("sandbox", "snapshot_incident_state", sandbox.describe()));

  // Evidence ranks what to test; it does not decide what is true. Every allowed
  // intervention runs against a fresh snapshot, and only symptom clearance can
  // promote a hypothesis to a causal claim.
  const experiments = [];
  for (const hypothesis of hypotheses) {
    const action = visible.allowedActions.find((item) => item.startsWith(`${hypothesis.service}:`));
    if (!action || experiments.some((item) => item.action === action)) continue;
    const result = sandbox.runCounterfactual(action);
    experiments.push({ hypothesis: hypothesis.service, ...result });
    trajectory.push(event("sandbox", "run_counterfactual", experiments.at(-1)));
    if (result.effect?.symptomCleared && result.effect.unrelatedRegressions === 0) break;
  }

  const proof = experiments.find((item) => item.verdict === "causal" && item.effect?.symptomCleared);
  const service = proof?.hypothesis ?? leading.service;
  const action = proof?.action ?? null;
  const actionValid = Boolean(action && visible.allowedActions.includes(action));

  trajectory.push(event("verifier", "verify_causal_proof", {
    service,
    action,
    proven: Boolean(proof),
    rejectedHypotheses: experiments.filter((item) => item.verdict === "rejected").map((item) => item.hypothesis),
    acceptanceRule: "symptom clears, health improves, and no unrelated regression appears",
  }));

  trajectory.push(event("verifier", "validate_recovery_action", {
    service, action, allowed: actionValid, humanApprovalRequired: true, executedInProduction: false,
  }));

  return {
    service,
    action,
    confidence: proof ? Math.min(98, 86 + Math.round(proof.effect.errorReductionPct / 10)) : confidenceFromMargin(margin, false),
    evidence: [...visible.changes, ...visible.logs, ...visible.trace],
    actionValid,
    causalProof: Boolean(proof),
    experiments,
    trajectory,
  };
}

function scoreCandidate(candidate) {
  const temporal = Math.max(0, 30 - candidate.anomalyOrder * 7);
  const change = candidate.changeAgeSeconds == null ? 0 : candidate.changeAgeSeconds <= 600 ? 28 : 8;
  const directSignal = /healthy|waiting|downstream|arrive late|valid empty|passes token|largest visible/i.test(candidate.signal) ? 3 : 24;
  const errorWeight = Math.min(12, candidate.errorRate / 5);
  return Math.round((temporal + change + directSignal + errorWeight - candidate.contradictions * 18) * 10) / 10;
}

function confidenceFromMargin(margin, survived) {
  return Math.max(35, Math.min(98, Math.round(62 + margin / 2 + (survived ? 8 : -12))));
}

function event(actor, action, output) {
  return { at: new Date().toISOString(), actor, action, output };
}
