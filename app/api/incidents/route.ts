import { publicScenario, scenarios } from "../../../core/scenarios.mjs";
import { hasPersistentStore, listIncidents, syncIncidents, type StoredIncident } from "../../lib/faultline-store";

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
  const sourceIncidents = (scenarios as Scenario[]).map((scenario) => {
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
  }) satisfies StoredIncident[];

  if (!hasPersistentStore) return Response.json({ incidents: sourceIncidents, persistence: "local" });

  try {
    await syncIncidents(sourceIncidents);
    return Response.json({ incidents: await listIncidents(), persistence: "supabase" });
  } catch (error) {
    console.error("Faultline incident sync failed", error);
    return Response.json({ incidents: sourceIncidents, persistence: "degraded" });
  }
}
