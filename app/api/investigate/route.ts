import { runIncidentOS } from "../../../core/incident-os.mjs";
import { runBaseline } from "../../../core/replay-agent.mjs";
import { scenarios } from "../../../core/scenarios.mjs";
import { claimRun, completeRun, enqueueRun, failRun, hasPersistentStore, latestRun } from "../../lib/faultline-store";

type Scenario = { id: string };

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { incidentId?: string; rerun?: boolean } | null;
  const scenario = (scenarios as Scenario[]).find((item) => item.id === body?.incidentId);
  if (!scenario) return Response.json({ error: "Incident not found." }, { status: 404 });

  if (!hasPersistentStore) {
    return Response.json({ status: "completed", persistence: "local", result: investigate(scenario) });
  }

  let run = await latestRun(scenario.id);
  if (run?.status === "completed" && !body?.rerun) {
    return Response.json({ status: "completed", persistence: "supabase", runId: run.id, attempt: run.attempt, result: run.result });
  }

  if (!run || run.status === "completed" || run.status === "failed") {
    try {
      run = await enqueueRun(scenario.id, (run?.attempt ?? 0) + 1);
    } catch {
      run = await latestRun(scenario.id);
    }
  }

  if (!run) return Response.json({ error: "Unable to queue the incident." }, { status: 503 });
  if (run.status === "running") {
    return Response.json({ status: "running", persistence: "supabase", runId: run.id, attempt: run.attempt }, { status: 202 });
  }

  const lease = await claimRun(run.id);
  if (!lease) {
    const active = await latestRun(scenario.id);
    return Response.json({ status: active?.status ?? "queued", persistence: "supabase", runId: active?.id, attempt: active?.attempt }, { status: 202 });
  }

  try {
    const result = investigate(scenario);
    const completed = await completeRun(run.id, lease.claimToken, result);
    return Response.json({ status: "completed", persistence: "supabase", runId: completed.id, attempt: completed.attempt, result: completed.result });
  } catch (error) {
    await failRun(run.id, lease.claimToken, error instanceof Error ? error.message : "Unknown investigation failure");
    return Response.json({ error: "Investigation failed." }, { status: 500 });
  }
}

function investigate(scenario: Scenario) {
  const incidentPackage = runIncidentOS(scenario);
  const baseline = runBaseline(scenario);
  return { ...incidentPackage, baseline };
}
