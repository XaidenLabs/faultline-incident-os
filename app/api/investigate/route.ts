// @ts-expect-error The incident engine is intentionally versioned as ESM JavaScript.
import { runIncidentOS } from "../../../core/incident-os.mjs";
// @ts-expect-error The replay workflow is intentionally versioned as ESM JavaScript.
import { runBaseline } from "../../../core/replay-agent.mjs";
// @ts-expect-error The replay dataset is intentionally versioned as ESM JavaScript.
import { scenarios } from "../../../core/scenarios.mjs";

type Scenario = { id: string };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { incidentId?: string } | null;
  const scenario = (scenarios as Scenario[]).find((item) => item.id === body?.incidentId);
  if (!scenario) return Response.json({ error: "Incident not found." }, { status: 404 });

  const incidentPackage = runIncidentOS(scenario);
  const baseline = runBaseline(scenario);
  return Response.json({ ...incidentPackage, baseline });
}
