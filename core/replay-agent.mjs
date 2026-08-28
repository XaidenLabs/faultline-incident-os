import { publicScenario } from "./scenarios.mjs";

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
  const survived = leading.contradicting === 0 && margin >= 12;

  trajectory.push(event("verifier", "falsify_leading_hypothesis", {
    target: leading.service,
    strongestAlternative: alternative.service,
    margin,
    survived,
    checks: ["temporal precedence", "cross-service propagation", "contradicting observations"],
  }));

  // A deliberately conservative behavior: ambiguous cases are not allowed to
  // jump from correlation to a high-confidence causal claim.
  const service = survived ? leading.service : hypotheses.find((item) => item.contradicting === 0)?.service ?? leading.service;
  const action = visible.allowedActions.find((item) => item.startsWith(`${service}:`)) ?? null;
  const actionValid = Boolean(action);

  trajectory.push(event("verifier", "validate_recovery_action", {
    service, action, allowed: actionValid, humanApprovalRequired: true,
  }));

  return {
    service,
    action,
    confidence: confidenceFromMargin(margin, survived),
    evidence: [...visible.changes, ...visible.logs, ...visible.trace],
    actionValid,
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

