export type StoredIncident = {
  id: string;
  title: string;
  symptom: string;
  severity: string;
  peakErrorRate: number;
  serviceCount: number;
  topology: string[];
  candidates: { service: string; errorRate: number; signal: string }[];
  changes: string[];
  allowedActionCount: number;
};

type IncidentRow = {
  id: string;
  title: string;
  symptom: string;
  severity: string;
  peak_error_rate: number | string;
  service_count: number;
  topology: string[];
  candidates: StoredIncident["candidates"];
  changes: string[];
  allowed_action_count: number;
};

export type RunRow = {
  id: string;
  incident_id: string;
  status: "queued" | "running" | "completed" | "failed";
  attempt: number;
  claim_token: string | null;
  result: unknown | null;
  error: string | null;
  queued_at: string;
};

const databaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const agentKey = process.env.FAULTLINE_AGENT_KEY;

export const hasPersistentStore = Boolean(databaseUrl && publishableKey && agentKey);

async function databaseFetch<T>(path: string, init: RequestInit = {}) {
  if (!hasPersistentStore) throw new Error("Faultline persistence is not configured.");
  const response = await fetch(`${databaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: publishableKey!,
      "x-faultline-agent-key": agentKey!,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Faultline database request failed (${response.status}): ${detail}`);
  }
  const body = await response.text();
  return body ? JSON.parse(body) as T : null as T;
}

export async function syncIncidents(incidents: StoredIncident[]) {
  const rows = incidents.map((incident) => ({
    id: incident.id,
    title: incident.title,
    symptom: incident.symptom,
    severity: incident.severity,
    peak_error_rate: incident.peakErrorRate,
    service_count: incident.serviceCount,
    topology: incident.topology,
    candidates: incident.candidates,
    changes: incident.changes,
    allowed_action_count: incident.allowedActionCount,
    updated_at: new Date().toISOString(),
  }));
  await databaseFetch<IncidentRow[]>("faultline_incidents?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
}

export async function listIncidents() {
  const rows = await databaseFetch<IncidentRow[]>("faultline_incidents?select=*&order=id.asc");
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    symptom: row.symptom,
    severity: row.severity,
    peakErrorRate: Number(row.peak_error_rate),
    serviceCount: row.service_count,
    topology: row.topology,
    candidates: row.candidates,
    changes: row.changes,
    allowedActionCount: row.allowed_action_count,
  } satisfies StoredIncident));
}

export async function latestRun(incidentId: string) {
  const rows = await databaseFetch<RunRow[]>(`faultline_runs?incident_id=eq.${encodeURIComponent(incidentId)}&select=*&order=queued_at.desc&limit=1`);
  return rows[0] ?? null;
}

export async function enqueueRun(incidentId: string, attempt: number) {
  const rows = await databaseFetch<RunRow[]>("faultline_runs", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ incident_id: incidentId, attempt, status: "queued" }),
  });
  return rows[0];
}

export async function claimRun(runId: string) {
  const claimToken = crypto.randomUUID();
  const rows = await databaseFetch<RunRow[]>(`faultline_runs?id=eq.${runId}&status=eq.queued`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status: "running", claim_token: claimToken, started_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  });
  return rows[0] ? { run: rows[0], claimToken } : null;
}

export async function completeRun(runId: string, claimToken: string, result: unknown) {
  const rows = await databaseFetch<RunRow[]>(`faultline_runs?id=eq.${runId}&status=eq.running&claim_token=eq.${claimToken}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status: "completed", result, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  });
  if (!rows[0]) throw new Error("The investigation lease was lost before completion.");
  return rows[0];
}

export async function failRun(runId: string, claimToken: string, error: string) {
  await databaseFetch<RunRow[]>(`faultline_runs?id=eq.${runId}&status=eq.running&claim_token=eq.${claimToken}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: "failed", error: error.slice(0, 1000), completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  });
}
