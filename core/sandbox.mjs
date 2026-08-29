/**
 * A deterministic, isolated incident laboratory. It never contacts production
 * systems and exposes no answer key to the investigator. Each intervention is
 * applied to a fresh copy of the same failing state so experiments cannot
 * contaminate one another.
 */
export function createIncidentSandbox(scenario) {
  const baseline = healthSnapshot(scenario, false);

  return {
    describe() {
      return {
        incident: scenario.id,
        isolation: "fresh synthetic snapshot per experiment",
        productionConnected: false,
        baseline,
      };
    },

    runCounterfactual(action) {
      if (!scenario.allowedActions.includes(action)) {
        return {
          action,
          accepted: false,
          reason: "Action is outside the incident sandbox allowlist.",
          productionConnected: false,
        };
      }

      const causeRemoved = action === scenario.gold.action;
      const after = healthSnapshot(scenario, causeRemoved);
      const before = structuredClone(baseline);

      return {
        experimentId: `${scenario.id}-CF-${String(scenario.allowedActions.indexOf(action) + 1).padStart(2, "0")}`,
        action,
        changedVariable: action.split(":")[1],
        accepted: true,
        isolation: "fresh synthetic snapshot",
        productionConnected: false,
        before,
        after,
        effect: {
          healthDelta: after.healthScore - before.healthScore,
          errorReductionPct: round(((before.errorRatePct - after.errorRatePct) / before.errorRatePct) * 100),
          symptomCleared: after.errorRatePct <= after.sloErrorBudgetPct,
          unrelatedRegressions: 0,
        },
        verdict: causeRemoved ? "causal" : "rejected",
      };
    },
  };
}

function healthSnapshot(scenario, recovered) {
  const peakError = Math.max(...scenario.candidates.map((candidate) => candidate.errorRate));
  const failingRate = Math.max(7, round(peakError));
  return recovered
    ? {
        healthScore: 96,
        errorRatePct: 0.8,
        sloErrorBudgetPct: 1,
        failingChecks: [],
        symptom: "cleared",
      }
    : {
        healthScore: Math.max(18, 68 - Math.round(failingRate)),
        errorRatePct: failingRate,
        sloErrorBudgetPct: 1,
        failingChecks: [scenario.symptom],
        symptom: scenario.symptom,
      };
}

function round(value) {
  return Math.round(value * 10) / 10;
}
