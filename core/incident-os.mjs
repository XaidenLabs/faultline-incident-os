import { createHash } from "node:crypto";
import { runFaultline } from "./replay-agent.mjs";
import { publicScenario } from "./scenarios.mjs";

/**
 * Faultline Incident OS turns one investigation into a complete, inspectable
 * incident lifecycle. The counterfactual investigator is the proof engine;
 * everything around it converts that proof into an operational outcome.
 */
export function runIncidentOS(scenario, options = {}) {
  const now = options.now ?? new Date().toISOString();
  const visible = publicScenario(scenario);
  const intake = normalizeIncident(visible);
  const investigation = runFaultline(scenario);
  const recovery = buildRecoveryPlan(visible, investigation);
  const rehearsal = buildRecoveryRehearsal(investigation);
  const postmortem = buildPostmortem(visible, investigation, rehearsal);
  const runbook = compileRunbook(visible, investigation, rehearsal);

  const incidentPackage = {
    schemaVersion: "1.0",
    generatedAt: now,
    mode: "synthetic-isolated-replay",
    incident: intake,
    lifecycle: {
      observe: intake.status,
      investigate: investigation.causalProof ? "complete" : "inconclusive",
      prove: investigation.causalProof ? "passed" : "failed",
      rehearse: rehearsal.status,
      approve: recovery.approval.status,
      learn: runbook.status,
    },
    investigation: {
      rootService: investigation.service,
      confidence: investigation.confidence,
      evidence: investigation.evidence,
      rejectedHypotheses: investigation.experiments
        .filter((experiment) => experiment.verdict === "rejected")
        .map((experiment) => experiment.hypothesis),
      counterfactuals: investigation.experiments,
      trajectory: investigation.trajectory,
    },
    recovery,
    rehearsal,
    postmortem,
    runbook,
  };

  return {
    ...incidentPackage,
    audit: buildAudit(incidentPackage),
  };
}

export function renderIncidentReport(pkg) {
  const rejected = pkg.investigation.rejectedHypotheses.length
    ? pkg.investigation.rejectedHypotheses.join(", ")
    : "None required";
  return `# ${pkg.incident.id} — ${pkg.incident.title}

## Outcome

- Root service: ${pkg.investigation.rootService}
- Causal proof: ${pkg.lifecycle.prove}
- Recovery rehearsal: ${pkg.lifecycle.rehearse}
- Production approval: ${pkg.lifecycle.approve}
- Reusable runbook: ${pkg.runbook.id}

## What happened

${pkg.postmortem.summary}

## Proof

${pkg.postmortem.proof}

Rejected alternatives: ${rejected}.

## Recovery gates

${pkg.rehearsal.healthGates.map((gate) => `- ${gate.name}: ${gate.passed ? "PASS" : "FAIL"} — ${gate.observed}`).join("\n")}

## Safety

No production connection was available during diagnosis or rehearsal. The proposed recovery remains ${pkg.recovery.approval.status} and requires ${pkg.recovery.approval.role} approval.

Audit SHA-256: \`${pkg.audit.sha256}\`
`;
}

function normalizeIncident(scenario) {
  const services = [...new Set([
    ...scenario.candidates.map((candidate) => candidate.service),
    ...scenario.topology.flatMap((edge) => edge.split(">")),
  ])];
  const peakErrorRate = Math.max(...scenario.candidates.map((candidate) => candidate.errorRate));
  return {
    id: scenario.id,
    title: scenario.title,
    symptom: scenario.symptom,
    severity: peakErrorRate >= 40 ? "SEV-1" : peakErrorRate >= 15 ? "SEV-2" : "SEV-3",
    status: "normalized",
    blastRadius: { services, serviceCount: services.length },
    evidenceSources: ["metrics", "logs", "traces", "changes", "topology"],
    allowedActionCount: scenario.allowedActions.length,
  };
}

function buildRecoveryPlan(scenario, investigation) {
  const action = investigation.action;
  const service = investigation.service;
  return {
    status: investigation.causalProof && action ? "proposed" : "blocked",
    action,
    target: service,
    scope: `incident-scoped ${service} recovery`,
    rationale: investigation.causalProof
      ? "The same intervention cleared the original symptom in an isolated fresh snapshot."
      : "No action may be proposed until a counterfactual proof succeeds.",
    risk: actionRisk(action),
    rollbackCondition: "Any health gate regresses or the original symptom remains above its SLO threshold.",
    constraints: {
      catalogBound: Boolean(action && scenario.allowedActions.includes(action)),
      productionExecuted: false,
    },
    approval: {
      required: true,
      role: "qualified on-call engineer",
      status: "awaiting-human",
    },
  };
}

function buildRecoveryRehearsal(investigation) {
  const proof = investigation.experiments.find((experiment) => experiment.verdict === "causal");
  if (!proof) {
    return { status: "blocked", experimentId: null, healthGates: [], productionConnected: false };
  }
  const gates = [
    { name: "original-symptom-cleared", passed: proof.effect.symptomCleared, observed: `${proof.before.errorRatePct}% → ${proof.after.errorRatePct}% errors` },
    { name: "service-health-restored", passed: proof.after.healthScore >= 90, observed: `${proof.before.healthScore} → ${proof.after.healthScore} health score` },
    { name: "no-unrelated-regressions", passed: proof.effect.unrelatedRegressions === 0, observed: `${proof.effect.unrelatedRegressions} regression(s)` },
    { name: "production-isolation", passed: proof.productionConnected === false, observed: "productionConnected=false" },
  ];
  return {
    status: gates.every((gate) => gate.passed) ? "passed" : "failed",
    experimentId: proof.experimentId,
    action: proof.action,
    before: proof.before,
    after: proof.after,
    healthGates: gates,
    productionConnected: false,
  };
}

function buildPostmortem(scenario, investigation, rehearsal) {
  const rejected = investigation.experiments.filter((experiment) => experiment.verdict === "rejected");
  return {
    status: investigation.causalProof ? "evidence-backed" : "draft-inconclusive",
    summary: `${scenario.symptom}. The verified causal service was ${investigation.service}.`,
    proof: rehearsal.status === "passed"
      ? `${rehearsal.action} changed one variable in ${rehearsal.experimentId}; error rate moved from ${rehearsal.before.errorRatePct}% to ${rehearsal.after.errorRatePct}% with no unrelated regressions.`
      : "No counterfactual satisfied every recovery gate.",
    alternativesRejected: rejected.map((experiment) => ({
      service: experiment.hypothesis,
      action: experiment.action,
      reason: `The symptom remained at ${experiment.after.errorRatePct}% errors.`,
    })),
    evidence: investigation.evidence,
    limitations: [
      "Synthetic deterministic incident snapshot.",
      "Production execution and organizational impact estimation are outside this submission.",
    ],
  };
}

function compileRunbook(scenario, investigation, rehearsal) {
  const ready = investigation.causalProof && rehearsal.status === "passed";
  return {
    id: `RB-${scenario.id.replace("INC-", "")}-${investigation.service.toUpperCase()}`,
    status: ready ? "compiled" : "blocked",
    trigger: scenario.symptom,
    verify: {
      requiredEvidence: investigation.evidence,
      counterfactualAction: investigation.action,
      acceptanceRule: "Original symptom clears, health score >= 90, and unrelated regressions = 0.",
    },
    recover: {
      action: ready ? investigation.action : null,
      approvalRequired: true,
      autoExecute: false,
    },
    regressionTest: ready ? {
      fixture: scenario.id,
      assertion: `${investigation.action} must clear ${scenario.symptom}`,
      expectedMaxErrorRatePct: 1,
    } : null,
  };
}

function actionRisk(action) {
  if (!action) return { level: "unknown", reason: "No proven action." };
  if (/reroute|certificate|leader/i.test(action)) return { level: "medium", reason: "Changes shared infrastructure state; staged approval required." };
  return { level: "low", reason: "Scoped reversible action with a verified rollback gate." };
}

function buildAudit(value) {
  const canonical = JSON.stringify(value);
  return {
    algorithm: "sha256",
    sha256: createHash("sha256").update(canonical).digest("hex"),
    appendOnlyTrajectoryEvents: value.investigation.trajectory.length,
    artifactTypes: ["incident-package", "counterfactual-proof", "recovery-plan", "postmortem", "runbook"],
  };
}
