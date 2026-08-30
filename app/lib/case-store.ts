import { faultlineSupabaseKey, faultlineSupabaseUrl } from "./supabase-public";

export type InvestigationCase = {
  id: string;
  origin: "live_public_signal" | "external_ingest" | "synthetic_proof_case";
  visibility: "public" | "private";
  title: string;
  summary: string;
  source_name: string;
  source_url: string | null;
  source_external_id: string | null;
  source_snapshot_id: number | null;
  source_observation_id: number | null;
  status: "captured" | "triaged" | "needs_adapter" | "proof_ready" | "proved";
  proof_status: "unavailable" | "ready" | "proved";
  proof_reason: string;
  safe_adapter_id: string | null;
  evidence: {
    provenance?: Record<string, unknown>;
    sourceStatus?: Record<string, unknown>;
    observation?: Record<string, unknown> | null;
  };
  hypotheses: unknown[];
  content_hash: string;
  captured_at: string;
  created_at: string;
  updated_at: string;
};

export type CaseEvent = {
  id: number;
  case_id: string;
  event_type: string;
  title: string;
  detail: string;
  evidence: Record<string, unknown>;
  occurred_at: string;
};

async function publicFetch<T>(path: string) {
  const response = await fetch(`${faultlineSupabaseUrl}/rest/v1/${path}`, {
    headers: { apikey: faultlineSupabaseKey },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Case memory query failed (${response.status})`);
  return response.json() as Promise<T>;
}

export async function getPublicCase(id: string) {
  const safeId = encodeURIComponent(id);
  const [cases, events] = await Promise.all([
    publicFetch<InvestigationCase[]>(`faultline_investigation_cases?select=*&id=eq.${safeId}&visibility=eq.public&limit=1`),
    publicFetch<CaseEvent[]>(`faultline_case_events?select=*&case_id=eq.${safeId}&order=occurred_at.asc,id.asc`),
  ]);
  return cases[0] ? { investigationCase: cases[0], events } : null;
}

export async function getPublicCases(limit = 8) {
  return publicFetch<InvestigationCase[]>(`faultline_investigation_cases?select=*&visibility=eq.public&order=created_at.desc,id.desc&limit=${Math.min(Math.max(limit, 1), 24)}`);
}

export async function promoteLiveSignal(snapshotId: number, observationId?: number) {
  const response = await fetch(`${faultlineSupabaseUrl}/functions/v1/promote-live-signal`, {
    method: "POST",
    headers: { apikey: faultlineSupabaseKey, "Content-Type": "application/json" },
    body: JSON.stringify({ snapshotId, observationId }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as { case?: Pick<InvestigationCase, "id" | "title" | "status" | "proof_status" | "proof_reason">; error?: string };
  if (!response.ok || !payload.case) throw new Error(payload.error ?? "Unable to create the investigation case");
  return payload.case;
}
