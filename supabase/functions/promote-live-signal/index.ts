import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase function environment is incomplete.");

const database = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sourceNames: Record<string, string> = { github: "GitHub", cloudflare: "Cloudflare", npm: "npm" };

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
  if (request.method !== "POST") return cors(json({ error: "Method not allowed" }, 405));
  if (Number(request.headers.get("content-length") ?? 0) > 4096) return cors(json({ error: "Payload too large" }, 413));

  const input = await request.json().catch(() => null) as { snapshotId?: number; observationId?: number } | null;
  const snapshotId = Number(input?.snapshotId);
  const observationId = input?.observationId == null ? null : Number(input.observationId);
  if (!Number.isSafeInteger(snapshotId) || snapshotId < 1) return cors(json({ error: "A valid snapshotId is required" }, 400));
  if (observationId !== null && (!Number.isSafeInteger(observationId) || observationId < 1)) return cors(json({ error: "observationId must be a positive integer" }, 400));

  const { data: snapshot, error: snapshotError } = await database
    .from("faultline_signal_snapshots")
    .select("id,source,source_url,captured_at,indicator,description,component_count,degraded_component_count,active_incident_count,content_hash,payload")
    .eq("id", snapshotId)
    .maybeSingle();
  if (snapshotError) return cors(json({ error: "Unable to read the source snapshot" }, 500));
  if (!snapshot) return cors(json({ error: "Snapshot not found" }, 404));

  let observation: Record<string, unknown> | null = null;
  if (observationId !== null) {
    const { data, error } = await database
      .from("faultline_observations")
      .select("id,snapshot_id,source,external_id,kind,title,body,status,severity,affected_components,source_url,fingerprint,captured_at,source_updated_at")
      .eq("id", observationId)
      .eq("snapshot_id", snapshotId)
      .maybeSingle();
    if (error) return cors(json({ error: "Unable to read the observation" }, 500));
    if (!data) return cors(json({ error: "Observation does not belong to this snapshot" }, 400));
    observation = data;
  }

  const caseKey = `live:${snapshotId}:${observationId ?? 0}`;
  const existing = await findCase(caseKey);
  if (existing) return cors(json({ case: existing, created: false }));

  const sourceName = sourceNames[snapshot.source] ?? snapshot.source;
  const title = String(observation?.title ?? `${sourceName}: ${snapshot.description}`).slice(0, 240);
  const summary = String(observation?.body || `${snapshot.active_incident_count} active incident(s), ${snapshot.degraded_component_count} degraded component(s), and ${snapshot.component_count} observed component(s).`).slice(0, 4000);
  const evidence = {
    provenance: {
      source: snapshot.source,
      sourceUrl: String(observation?.source_url ?? snapshot.source_url),
      capturedAt: String(observation?.captured_at ?? snapshot.captured_at),
      snapshotId,
      observationId,
      snapshotHash: snapshot.content_hash,
      observationFingerprint: observation?.fingerprint ?? null,
    },
    sourceStatus: {
      indicator: snapshot.indicator,
      description: snapshot.description,
      activeIncidents: snapshot.active_incident_count,
      degradedComponents: snapshot.degraded_component_count,
      observedComponents: snapshot.component_count,
    },
    observation,
  };
  const proofReason = "This evidence comes from a third-party public status feed. Faultline can preserve and triage it, but causal tests require a safe environment adapter that can replay the affected system.";
  const contentHash = await sha256(JSON.stringify(evidence));
  const recordedAt = new Date().toISOString();

  const { data: createdCase, error: insertError } = await database
    .from("faultline_investigation_cases")
    .insert({
      case_key: caseKey,
      origin: "live_public_signal",
      visibility: "public",
      title,
      summary,
      source_name: sourceName,
      source_url: String(observation?.source_url ?? snapshot.source_url),
      source_external_id: observation?.external_id ?? `${snapshot.source}:snapshot:${snapshotId}`,
      source_snapshot_id: snapshotId,
      source_observation_id: observationId,
      status: "needs_adapter",
      proof_status: "unavailable",
      proof_reason: proofReason,
      evidence,
      hypotheses: [],
      content_hash: contentHash,
      captured_at: String(observation?.captured_at ?? snapshot.captured_at),
    })
    .select("id,title,status,proof_status,proof_reason,source_name,created_at")
    .single();

  if (insertError || !createdCase) {
    const raced = await findCase(caseKey);
    if (raced) return cors(json({ case: raced, created: false }));
    return cors(json({ error: "Unable to create the investigation case" }, 500));
  }

  const { error: eventError } = await database.from("faultline_case_events").insert([
    {
      case_id: createdCase.id,
      event_type: "captured",
      title: "Public evidence captured",
      detail: `${sourceName} supplied the source record and timestamp.`,
      evidence: evidence.provenance,
      occurred_at: String(observation?.captured_at ?? snapshot.captured_at),
    },
    {
      case_id: createdCase.id,
      event_type: "normalized",
      title: "Evidence normalized",
      detail: "Faultline stored the source status, counts, and content fingerprints in a consistent case format.",
      evidence: evidence.sourceStatus,
      occurred_at: recordedAt,
    },
    {
      case_id: createdCase.id,
      event_type: "adapter_check",
      title: "Causal proof is not available yet",
      detail: proofReason,
      evidence: { safeAdapterConnected: false, productionActionTaken: false },
      occurred_at: recordedAt,
    },
  ]);

  if (eventError) {
    console.error("Unable to append case events", eventError);
    await database.from("faultline_investigation_cases").delete().eq("id", createdCase.id);
    return cors(json({ error: "Unable to save the investigation timeline" }, 500));
  }

  return cors(json({ case: createdCase, created: true }, 201));
});

async function findCase(caseKey: string) {
  const { data } = await database
    .from("faultline_investigation_cases")
    .select("id,title,status,proof_status,proof_reason,source_name,created_at")
    .eq("case_key", caseKey)
    .maybeSingle();
  return data;
}

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

function cors(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Headers", "apikey, content-type");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return new Response(response.body, { status: response.status, headers });
}
