// @ts-expect-error The replay dataset is intentionally versioned as ESM JavaScript.
import { publicScenario, scenarios } from "../../../core/scenarios.mjs";

type Candidate = { service: string; errorRate: number; signal: string };
type Scenario = {
  id: string;
  title: string;
  symptom: string;
  topology: string[];
  candidates: Candidate[];
  changes: string[];
  allowedActions: string[];
};

export async function GET() {
  const incidents = (scenarios as Scenario[]).map((scenario) => {
    const visible = publicScenario(scenario) as Scenario;
    const peak = Math.max(...visible.candidates.map((candidate) => candidate.errorRate));
    const services = new Set(visible.topology.flatMap((edge) => edge.split(">")));
    return {
      id: visible.id,
      title: visible.title,
      symptom: visible.symptom,
      severity: peak >= 40 ? "SEV-1" : peak >= 15 ? "SEV-2" : "SEV-3",
      peakErrorRate: peak,
      serviceCount: services.size,
      topology: visible.topology,
      candidates: visible.candidates,
      changes: visible.changes,
      allowedActionCount: visible.allowedActions.length,
    };
  });
  return Response.json({ incidents });
}
