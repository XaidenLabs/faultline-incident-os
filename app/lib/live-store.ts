import { faultlineSupabaseKey, faultlineSupabaseUrl } from "./supabase-public";

export type LiveSnapshot = {
  id: number;
  run_id: string;
  source: "github" | "cloudflare" | "npm";
  source_url: string;
  captured_at: string;
  source_updated_at: string | null;
  indicator: string;
  description: string;
  component_count: number;
  degraded_component_count: number;
  active_incident_count: number;
  content_hash: string;
};

export type LiveObservation = {
  id: number;
  snapshot_id: number;
  source: LiveSnapshot["source"];
  external_id: string;
  kind: "incident" | "component" | "status";
  title: string;
  body: string;
  status: string;
  severity: "info" | "minor" | "major" | "critical";
  affected_components: string[];
  source_url: string;
  fingerprint: string;
  captured_at: string;
  source_updated_at: string | null;
};

export type LiveInsight = {
  id: string;
  run_id: string;
  captured_at: string;
  provider: string;
  model: string | null;
  status: "completed" | "skipped" | "failed";
  summary: string;
  priorities: string[];
  evidence: unknown[];
};

export type IngestionRun = {
  id: string;
  trigger: string;
  status: "running" | "completed" | "partial" | "failed";
  sources_attempted: number;
  sources_succeeded: number;
  error: string | null;
  started_at: string;
  completed_at: string | null;
};

async function publicFetch<T>(path: string) {
  const response = await fetch(`${faultlineSupabaseUrl}/rest/v1/${path}`, {
    headers: { apikey: faultlineSupabaseKey, Authorization: `Bearer ${faultlineSupabaseKey}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Live memory query failed (${response.status})`);
  return response.json() as Promise<T>;
}

export async function getLiveSignalMemory() {
  const [snapshots, observations, insights, runs] = await Promise.all([
    publicFetch<LiveSnapshot[]>("faultline_signal_snapshots?select=id,run_id,source,source_url,captured_at,source_updated_at,indicator,description,component_count,degraded_component_count,active_incident_count,content_hash&order=captured_at.desc,id.desc&limit=24"),
    publicFetch<LiveObservation[]>("faultline_observations?select=*&order=captured_at.desc,id.desc&limit=180"),
    publicFetch<LiveInsight[]>("faultline_agent_insights?select=*&order=captured_at.desc,id.desc&limit=12"),
    publicFetch<IngestionRun[]>("faultline_ingestion_runs?select=*&order=started_at.desc,id.desc&limit=12"),
  ]);

  const latestBySource = Array.from(snapshots.reduce((latest, snapshot) => {
    if (!latest.has(snapshot.source)) latest.set(snapshot.source, snapshot);
    return latest;
  }, new Map<LiveSnapshot["source"], LiveSnapshot>()).values());
  const seenFingerprints = new Set<string>();
  const changeStream = observations.filter((observation) => {
    if (seenFingerprints.has(observation.fingerprint)) return false;
    seenFingerprints.add(observation.fingerprint);
    return true;
  });

  return {
    sources: latestBySource,
    snapshots,
    observations: changeStream,
    insight: insights[0] ?? null,
    run: runs[0] ?? null,
    capturedRows: { snapshots: snapshots.length, observations: observations.length, insights: insights.length },
  };
}
