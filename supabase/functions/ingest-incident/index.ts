import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

type IncidentInput = {
  source?: string;
  externalId?: string;
  title?: string;
  summary?: string;
  observedAt?: string;
  sourceUrl?: string;
  evidence?: Record<string, unknown>;
  topology?: string[];
  allowedActions?: string[];
  safeAdapterId?: string;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ingestToken = Deno.env.get("FAULTLINE_INGEST_TOKEN");

if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase function environment is incomplete.");

const database = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!ingestToken) return json({ error: "External ingestion is not configured" }, 503);
  if (!(await matchesSecret(request.headers.get("x-faultline-ingest-token") ?? "", ingestToken))) return json({ error: "Invalid ingestion token" }, 401);
  if (Number(request.headers.get("content-length") ?? 0) > 20_000) return json({ error: "Payload exceeds the 20 KB limit" }, 413);

  const input = await request.json().catch(() => null) as IncidentInput | null;
  const problem = validate(input);
  if (problem) return json({ error: problem }, 400);

  const source = input!.source!.trim().slice(0, 80);
  const externalId = input!.externalId!.trim().slice(0, 160);
  const safeAdapterId = cleanOptional(input!.safeAdapterId, 160);
  const topology = cleanList(input!.topology, 60, 180);
  const allowedActions = cleanList(input!.allowedActions, 60, 180);
  const proofReady = Boolean(safeAdapterId && topology.length && allowedActions.length);
  const evidence = {
    supplied: input!.evidence ?? {},
    topology,
    allowedActions,
    receivedAt: new Date().toISOString(),
  };
  const caseKey = `external:${await sha256(`${source}|${externalId}`)}`;
  const contentHash = await sha256(JSON.stringify(evidence));
  const capturedAt = validDate(input!.observedAt) ?? new Date().toISOString();
  const proofReason = proofReady
    ? `Safe adapter ${safeAdapterId} and an allowed action list were supplied. The case is ready for an isolated proof run.`
    : "The evidence is saved, but causal proof needs a safe environment adapter, service topology, and an allowed action list.";

  const { data: existing } = await database
    .from("faultline_investigation_cases")
    .select("id,title,status,proof_status,proof_reason,created_at,updated_at")
    .eq("case_key", caseKey)
    .maybeSingle();
  if (existing) return json({ case: existing, created: false, nextStep: proofReady ? "Run the case through the connected isolated adapter." : "Connect a safe adapter and provide allowed recovery actions." });

  const { data: investigationCase, error } = await database
    .from("faultline_investigation_cases")
    .upsert({
      case_key: caseKey,
      origin: "external_ingest",
      visibility: "private",
      title: input!.title!.trim().slice(0, 240),
      summary: input!.summary!.trim().slice(0, 4000),
      source_name: source,
      source_url: cleanOptional(input!.sourceUrl, 500),
      source_external_id: externalId,
      status: proofReady ? "proof_ready" : "needs_adapter",
      proof_status: proofReady ? "ready" : "unavailable",
      proof_reason: proofReason,
      safe_adapter_id: safeAdapterId,
      evidence,
      hypotheses: [],
      content_hash: contentHash,
      captured_at: capturedAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: "case_key" })
    .select("id,title,status,proof_status,proof_reason,created_at,updated_at")
    .single();

  if (error || !investigationCase) return json({ error: "Unable to store the incident" }, 500);

  const { error: eventError } = await database.from("faultline_case_events").insert([
    {
      case_id: investigationCase.id,
      event_type: "captured",
      title: "External incident received",
      detail: `Faultline accepted incident ${externalId} from ${source}.`,
      evidence: { source, externalId, capturedAt, contentHash },
    },
    {
      case_id: investigationCase.id,
      event_type: "adapter_check",
      title: proofReady ? "Case is ready for safe proof" : "Case needs a safe adapter",
      detail: proofReason,
      evidence: { safeAdapterId, topologyItems: topology.length, allowedActions: allowedActions.length, productionActionTaken: false },
    },
  ]);

  if (eventError) {
    console.error("Unable to append case events", eventError);
    await database.from("faultline_investigation_cases").delete().eq("id", investigationCase.id);
    return json({ error: "Unable to save the investigation timeline" }, 500);
  }

  return json({
    case: investigationCase,
    created: true,
    nextStep: proofReady ? "Run the case through the connected isolated adapter." : "Connect a safe adapter and provide allowed recovery actions.",
  }, 202);
});

function validate(input: IncidentInput | null) {
  if (!input || typeof input !== "object") return "A JSON incident payload is required";
  if (!input.source?.trim()) return "source is required";
  if (!input.externalId?.trim()) return "externalId is required";
  if (!input.title?.trim()) return "title is required";
  if (!input.summary?.trim()) return "summary is required";
  if (input.evidence && (Array.isArray(input.evidence) || typeof input.evidence !== "object")) return "evidence must be a JSON object";
  return null;
}

function cleanList(value: unknown, maxItems: number, maxLength: number) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).slice(0, maxItems).map((item) => item.trim().slice(0, maxLength)) : [];
}

function cleanOptional(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null;
}

function validDate(value: unknown) {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

async function matchesSecret(provided: string, expected: string) {
  if (!provided || provided.length !== expected.length) return false;
  const [left, right] = await Promise.all([sha256(provided), sha256(expected)]);
  return left === right;
}

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
