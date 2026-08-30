import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";

type StatusComponent = {
  id: string;
  name: string;
  status: string;
  updated_at?: string;
  group?: boolean;
};

type StatusIncident = {
  id: string;
  name: string;
  status: string;
  impact: string;
  updated_at?: string;
  shortlink?: string;
  components?: StatusComponent[];
  incident_updates?: { body?: string; status?: string; updated_at?: string }[];
};

type StatusSummary = {
  page: { name: string; updated_at?: string };
  status: { indicator: string; description: string };
  components: StatusComponent[];
  incidents: StatusIncident[];
};

const sources = [
  { id: "github", name: "GitHub", api: "https://www.githubstatus.com/api/v2/summary.json", page: "https://www.githubstatus.com" },
  { id: "cloudflare", name: "Cloudflare", api: "https://www.cloudflarestatus.com/api/v2/summary.json", page: "https://www.cloudflarestatus.com" },
  { id: "npm", name: "npm", api: "https://status.npmjs.org/api/v2/summary.json", page: "https://status.npmjs.org" },
] as const;

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase function environment is incomplete.");

const database = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const input = await request.json().catch(() => ({})) as { trigger?: string };
  const trigger = ["schedule", "manual", "deploy"].includes(input.trigger ?? "") ? input.trigger : "schedule";
  const startedAt = new Date().toISOString();
  const { data: run, error: runError } = await database
    .from("faultline_ingestion_runs")
    .insert({ trigger, status: "running", sources_attempted: sources.length, started_at: startedAt })
    .select("id")
    .single();

  if (runError || !run) return json({ error: "Unable to create ingestion run", detail: runError?.message }, 500);

  const outcomes = await Promise.allSettled(sources.map((source) => captureSource(run.id, source)));
  const captures = outcomes.flatMap((outcome) => outcome.status === "fulfilled" ? [outcome.value] : []);
  const failures = outcomes.flatMap((outcome, index) => outcome.status === "rejected" ? [`${sources[index].id}: ${safeError(outcome.reason)}`] : []);
  const insight = await createInsight(run.id, captures);
  const status = captures.length === sources.length ? "completed" : captures.length > 0 ? "partial" : "failed";

  await database
    .from("faultline_ingestion_runs")
    .update({
      status,
      sources_succeeded: captures.length,
      error: failures.length ? failures.join(" | ").slice(0, 2000) : null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", run.id);

  return json({ runId: run.id, status, captures, insight, failures }, status === "failed" ? 502 : 200);
});

async function captureSource(runId: string, source: typeof sources[number]) {
  const response = await fetch(source.api, { signal: AbortSignal.timeout(12_000), headers: { "User-Agent": "Faultline-Live-Observer/1.0" } });
  if (!response.ok) throw new Error(`upstream returned ${response.status}`);
  const summary = await response.json() as StatusSummary;
  if (!summary.status || !Array.isArray(summary.components) || !Array.isArray(summary.incidents)) throw new Error("upstream payload shape changed");

  const capturedAt = new Date().toISOString();
  const components = summary.components
    .filter((component) => !component.group)
    .map((component) => ({ id: component.id, name: component.name, status: component.status, updatedAt: component.updated_at ?? null }));
  const activeIncidents = summary.incidents.map((incident) => ({
    id: incident.id,
    name: incident.name,
    status: incident.status,
    impact: incident.impact,
    updatedAt: incident.updated_at ?? null,
    shortlink: incident.shortlink ?? source.page,
    affectedComponents: (incident.components ?? []).map((component) => component.name),
    latestUpdate: incident.incident_updates?.[0]?.body ?? "",
  }));
  const normalizedPayload = { sourceName: summary.page.name || source.name, overall: summary.status, components, activeIncidents };
  const contentHash = await sha256(JSON.stringify(normalizedPayload));
  const degraded = components.filter((component) => component.status !== "operational");
  const { data: previousRows } = await database
    .from("faultline_signal_snapshots")
    .select("payload")
    .eq("source", source.id)
    .order("captured_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1);
  const previous = previousRows?.[0]?.payload as { components?: typeof components; activeIncidents?: typeof activeIncidents } | undefined;

  const { data: snapshot, error: snapshotError } = await database
    .from("faultline_signal_snapshots")
    .insert({
      run_id: runId,
      source: source.id,
      source_url: source.page,
      captured_at: capturedAt,
      source_updated_at: summary.page.updated_at ?? null,
      indicator: summary.status.indicator,
      description: summary.status.description,
      component_count: components.length,
      degraded_component_count: degraded.length,
      active_incident_count: activeIncidents.length,
      content_hash: contentHash,
      payload: normalizedPayload,
    })
    .select("id")
    .single();

  if (snapshotError || !snapshot) throw new Error(`snapshot insert failed: ${snapshotError?.message ?? "unknown"}`);

  const observations = [
    {
      snapshot_id: snapshot.id,
      source: source.id,
      external_id: `${source.id}:overall`,
      kind: "status",
      title: `${source.name}: ${summary.status.description}`,
      body: `${components.length - degraded.length} of ${components.length} observed components are operational.`,
      status: summary.status.indicator,
      severity: severity(summary.status.indicator),
      affected_components: degraded.map((component) => component.name),
      source_url: source.page,
      fingerprint: await sha256(`${source.id}|overall|${summary.status.indicator}|${summary.status.description}|${degraded.map((component) => component.name).sort().join(",")}`),
      captured_at: capturedAt,
      source_updated_at: summary.page.updated_at ?? null,
    },
    ...degraded.map((component) => ({
      snapshot_id: snapshot.id,
      source: source.id,
      external_id: component.id,
      kind: "component",
      title: component.name,
      body: `${component.name} is reporting ${component.status}.`,
      status: component.status,
      severity: severity(component.status),
      affected_components: [component.name],
      source_url: source.page,
      fingerprint: "",
      captured_at: capturedAt,
      source_updated_at: component.updatedAt,
    })),
    ...activeIncidents.map((incident) => ({
      snapshot_id: snapshot.id,
      source: source.id,
      external_id: incident.id,
      kind: "incident",
      title: incident.name,
      body: incident.latestUpdate,
      status: incident.status,
      severity: severity(incident.impact),
      affected_components: incident.affectedComponents,
      source_url: incident.shortlink,
      fingerprint: "",
      captured_at: capturedAt,
      source_updated_at: incident.updatedAt,
    })),
    ...(previous?.components ?? [])
      .filter((component) => component.status !== "operational" && components.find((current) => current.id === component.id)?.status === "operational")
      .map((component) => ({
        snapshot_id: snapshot.id,
        source: source.id,
        external_id: component.id,
        kind: "component",
        title: component.name,
        body: `${component.name} returned to operational status.`,
        status: "operational",
        severity: "info",
        affected_components: [component.name],
        source_url: source.page,
        fingerprint: "",
        captured_at: capturedAt,
        source_updated_at: components.find((current) => current.id === component.id)?.updatedAt ?? null,
      })),
    ...(previous?.activeIncidents ?? [])
      .filter((incident) => !activeIncidents.some((current) => current.id === incident.id))
      .map((incident) => ({
        snapshot_id: snapshot.id,
        source: source.id,
        external_id: incident.id,
        kind: "incident",
        title: incident.name,
        body: `${incident.name} is no longer present in the unresolved incident feed.`,
        status: "resolved",
        severity: "info",
        affected_components: incident.affectedComponents,
        source_url: incident.shortlink,
        fingerprint: "",
        captured_at: capturedAt,
        source_updated_at: capturedAt,
      })),
  ];

  for (const observation of observations) {
    if (!observation.fingerprint) observation.fingerprint = await sha256(`${source.id}|${observation.external_id}|${observation.status}|${observation.body}|${observation.source_updated_at ?? ""}`);
  }

  const externalIds = [...new Set(observations.map((observation) => observation.external_id))];
  const { data: recentRows } = await database
    .from("faultline_observations")
    .select("external_id,fingerprint,captured_at")
    .eq("source", source.id)
    .in("external_id", externalIds)
    .order("captured_at", { ascending: false })
    .limit(Math.max(200, externalIds.length * 3));
  const latestFingerprint = new Map<string, string>();
  for (const row of recentRows ?? []) if (!latestFingerprint.has(row.external_id)) latestFingerprint.set(row.external_id, row.fingerprint);
  const changedObservations = observations.filter((observation) => latestFingerprint.get(observation.external_id) !== observation.fingerprint);

  if (changedObservations.length) {
    const { error: observationsError } = await database.from("faultline_observations").insert(changedObservations);
    if (observationsError) throw new Error(`observation insert failed: ${observationsError.message}`);
  }

  return {
    source: source.id,
    snapshotId: snapshot.id,
    indicator: summary.status.indicator,
    description: summary.status.description,
    components: components.length,
    degraded: degraded.length,
    incidents: activeIncidents.length,
    changes: changedObservations.length,
    capturedAt,
  };
}

async function createInsight(runId: string, captures: Awaited<ReturnType<typeof captureSource>>[]) {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const evidence = captures.map((capture) => ({ source: capture.source, indicator: capture.indicator, degraded: capture.degraded, incidents: capture.incidents, capturedAt: capture.capturedAt }));
  const deterministic = captures.length
    ? `${captures.length} live sources captured. ${captures.reduce((sum, capture) => sum + capture.incidents, 0)} active incident(s) and ${captures.reduce((sum, capture) => sum + capture.degraded, 0)} degraded component(s) observed.`
    : "No live source completed successfully in this ingestion run.";

  if (!openaiKey || captures.length === 0) {
    const row = { run_id: runId, provider: "faultline-rules", model: null, status: "skipped", summary: deterministic, priorities: [], evidence };
    await database.from("faultline_agent_insights").insert(row);
    return row;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") ?? "gpt-5.6-luna",
        store: false,
        reasoning: { effort: "low" },
        max_output_tokens: 500,
        input: [
          { role: "developer", content: "You are Faultline's live observer. Summarize only the supplied public status evidence. Never invent a root cause, private telemetry, or recovery action. Return strict JSON with keys summary (string) and priorities (array of short strings)." },
          { role: "user", content: JSON.stringify(evidence) },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) throw new Error(`OpenAI returned ${response.status}`);
    const payload = await response.json() as { model?: string; output?: { type?: string; content?: { type?: string; text?: string }[] }[] };
    const outputText = payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
    if (!outputText) throw new Error("OpenAI response did not contain output text");
    const parsed = JSON.parse(outputText.replace(/^```json\s*|\s*```$/g, "")) as { summary?: string; priorities?: string[] };
    const row = {
      run_id: runId,
      provider: "openai",
      model: payload.model ?? Deno.env.get("OPENAI_MODEL") ?? "gpt-5.6-luna",
      status: "completed",
      summary: parsed.summary?.slice(0, 2000) || deterministic,
      priorities: Array.isArray(parsed.priorities) ? parsed.priorities.slice(0, 6) : [],
      evidence,
    };
    await database.from("faultline_agent_insights").insert(row);
    return row;
  } catch (error) {
    const row = { run_id: runId, provider: "openai", model: Deno.env.get("OPENAI_MODEL") ?? "gpt-5.6-luna", status: "failed", summary: deterministic, priorities: [], evidence, error: safeError(error).slice(0, 1000) };
    await database.from("faultline_agent_insights").insert(row);
    return row;
  }
}

function severity(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("critical")) return "critical";
  if (normalized.includes("major") || normalized.includes("outage")) return "major";
  if (normalized.includes("minor") || normalized.includes("degraded") || normalized.includes("partial")) return "minor";
  return "info";
}

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
