import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { scenarios } from "./scenarios.mjs";
import { runBaseline, runFaultline } from "./replay-agent.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = scenarios.map((scenario) => {
  const baseline = runBaseline(scenario);
  const faultline = runFaultline(scenario);
  return {
    id: scenario.id,
    title: scenario.title,
    gold: scenario.gold,
    baseline: outcome(baseline, scenario.gold),
    faultline: outcome(faultline, scenario.gold),
    experiments: faultline.experiments,
  };
});

const summary = {
  generatedAt: new Date().toISOString(),
  mode: "deterministic-replay",
  disclosure: "This replay validates orchestration and scoring. Live model results are written separately and must not be conflated with this artifact.",
  cases: results.length,
  baseline: aggregate(results.map((result) => result.baseline)),
  faultline: aggregate(results.map((result) => result.faultline)),
  results,
};

const evaluationDir = path.join(root, "artifacts", "evaluation");
const trajectoryDir = path.join(root, "artifacts", "trajectories");
await mkdir(evaluationDir, { recursive: true });
await mkdir(trajectoryDir, { recursive: true });
await writeFile(path.join(evaluationDir, "replay-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

const featured = runFaultline(scenarios[0]).trajectory.map((entry, index) => JSON.stringify({ sequence: index + 1, incident: scenarios[0].id, ...entry })).join("\n");
await writeFile(path.join(trajectoryDir, "featured-replay.jsonl"), `${featured}\n`);

const challengeScenario = scenarios.find((scenario) => scenario.id === "INC-2492");
const challenge = runFaultline(challengeScenario).trajectory.map((entry, index) => JSON.stringify({ sequence: index + 1, incident: challengeScenario.id, ...entry })).join("\n");
await writeFile(path.join(trajectoryDir, "challenge-counterfactual.jsonl"), `${challenge}\n`);

console.log(`\nFaultline deterministic replay (${summary.cases} cases)`);
console.log(`Baseline root-cause accuracy:  ${pct(summary.baseline.rootCauseAccuracy)}`);
console.log(`Faultline root-cause accuracy: ${pct(summary.faultline.rootCauseAccuracy)}`);
console.log(`Faultline recovery validity:   ${pct(summary.faultline.recoveryValidity)}`);
console.log(`Faultline causal proof rate:   ${pct(summary.faultline.causalProofRate)}`);
console.log(`Artifacts: artifacts/evaluation/replay-summary.json`);

function outcome(result, gold) {
  return {
    predictedService: result.service,
    predictedAction: result.action,
    rootCauseCorrect: result.service === gold.service,
    recoveryValid: result.action === gold.action,
    evidenceCount: result.evidence.length,
    confidence: result.confidence ?? null,
    causalProof: result.causalProof ?? false,
    experimentCount: result.experiments?.length ?? 0,
  };
}

function aggregate(items) {
  return {
    rootCauseAccuracy: fraction(items.filter((item) => item.rootCauseCorrect).length, items.length),
    recoveryValidity: fraction(items.filter((item) => item.recoveryValid).length, items.length),
    causalProofRate: fraction(items.filter((item) => item.causalProof).length, items.length),
    meanEvidenceCount: fraction(items.reduce((sum, item) => sum + item.evidenceCount, 0), items.length),
    meanExperimentCount: fraction(items.reduce((sum, item) => sum + item.experimentCount, 0), items.length),
  };
}

function fraction(value, total) { return Math.round((value / total) * 10000) / 10000; }
function pct(value) { return `${(value * 100).toFixed(1)}%`; }
