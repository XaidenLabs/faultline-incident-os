# Live Data Architecture

## Purpose

Live Pulse turns Faultline's database into operational memory rather than a fixture store. It records what the observer actually saw, when it saw it, which source supplied it, and whether the source changed.

- **Live Pulse** observes real public systems but cannot safely intervene in them, so it reports status evidence and changes without claiming causal proof.
- **Proof Lab** uses versioned synthetic incidents so counterfactual interventions, hidden labels, baselines, and repeatable scoring remain possible.

## Sources

- GitHub Status: `https://www.githubstatus.com/api/v2/summary.json`
- Cloudflare Status: `https://www.cloudflarestatus.com/api/v2/summary.json`
- npm Status: `https://status.npmjs.org/api/v2/summary.json`

These are public Atlassian Statuspage endpoints. No private telemetry, customer data, or third-party credentials are collected.

## Capture pipeline

```text
pg_cron (every 2 minutes)
  → pg_net invokes ingest-live-signals
  → Edge Function fetches all three sources concurrently
  → normalized source snapshots are appended to Supabase
  → changed incident/component/status observations are appended
  → deterministic or OpenAI-enriched triage summary is appended
  → Supabase Realtime notifies connected dashboards
  → 30-second client polling remains as a transport fallback
```

Every scheduled run stores an ingestion-health record with attempted sources, successful sources, timestamps, and bounded error details. One source can fail without discarding successful captures from the others.

## Tables and access

- `faultline_ingestion_runs`: scheduler health and partial-failure evidence.
- `faultline_signal_snapshots`: complete normalized state for every source capture.
- `faultline_observations`: append-only incident updates, degraded components, recoveries, and resolved incidents.
- `faultline_agent_insights`: evidence-linked deterministic or model-enriched triage summaries.

Source/time columns used by the dashboard are indexed. Every public-schema table has RLS enabled. Anonymous and authenticated roles receive `SELECT` only; the Edge Function writes with its server-side service role. The service-role credential is never returned by an API route or bundled into the browser.

Snapshots are always appended. Observations are appended only when their fingerprint changes. An unchanged run therefore creates three source snapshots but zero observation-change rows, preserving the historical state without duplicating unchanged events.

## Model enrichment

The collector does not require an LLM. If `OPENAI_API_KEY` is present in the Edge Function environment, it calls the OpenAI Responses API with `store: false` and an evidence-bounded prompt that forbids invented causes, private telemetry, or recovery actions. The default high-volume model is `gpt-5.6-luna`, overrideable with `OPENAI_MODEL`.

If the model request fails or no key exists, the function stores a deterministic summary and completes the ingestion run. This prevents a model outage from becoming an observability outage.

GitHub Models is not used because GitHub retired the service on July 30, 2026.

## Verification

Latest ingestion run:

```sql
select id, status, sources_attempted, sources_succeeded, error, started_at, completed_at
from public.faultline_ingestion_runs
order by started_at desc
limit 1;
```

Newest snapshot per source:

```sql
select distinct on (source)
  source,
  indicator,
  description,
  component_count,
  degraded_component_count,
  active_incident_count,
  captured_at
from public.faultline_signal_snapshots
order by source, captured_at desc;
```

Observation changes written by the latest run:

```sql
with latest as (
  select id from public.faultline_ingestion_runs order by started_at desc limit 1
)
select count(*)
from public.faultline_observations observation
join public.faultline_signal_snapshots snapshot on snapshot.id = observation.snapshot_id
join latest on latest.id = snapshot.run_id;
```
