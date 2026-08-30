create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create table public.faultline_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  trigger text not null default 'schedule' check (trigger in ('schedule', 'manual', 'deploy')),
  status text not null default 'running' check (status in ('running', 'completed', 'partial', 'failed')),
  sources_attempted integer not null default 0 check (sources_attempted >= 0),
  sources_succeeded integer not null default 0 check (sources_succeeded >= 0),
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.faultline_signal_snapshots (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.faultline_ingestion_runs(id) on delete cascade,
  source text not null check (source in ('github', 'cloudflare', 'npm')),
  source_url text not null,
  captured_at timestamptz not null default now(),
  source_updated_at timestamptz,
  indicator text not null,
  description text not null,
  component_count integer not null default 0 check (component_count >= 0),
  degraded_component_count integer not null default 0 check (degraded_component_count >= 0),
  active_incident_count integer not null default 0 check (active_incident_count >= 0),
  content_hash text not null,
  payload jsonb not null,
  constraint faultline_signal_snapshots_payload_object check (jsonb_typeof(payload) = 'object')
);

create table public.faultline_observations (
  id bigint generated always as identity primary key,
  snapshot_id bigint not null references public.faultline_signal_snapshots(id) on delete cascade,
  source text not null check (source in ('github', 'cloudflare', 'npm')),
  external_id text not null,
  kind text not null check (kind in ('incident', 'component', 'status')),
  title text not null,
  body text not null default '',
  status text not null,
  severity text not null check (severity in ('info', 'minor', 'major', 'critical')),
  affected_components jsonb not null default '[]'::jsonb,
  source_url text not null,
  fingerprint text not null,
  captured_at timestamptz not null default now(),
  source_updated_at timestamptz,
  constraint faultline_observations_components_array check (jsonb_typeof(affected_components) = 'array')
);

create table public.faultline_agent_insights (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.faultline_ingestion_runs(id) on delete cascade,
  captured_at timestamptz not null default now(),
  provider text not null,
  model text,
  status text not null check (status in ('completed', 'skipped', 'failed')),
  summary text not null,
  priorities jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  error text,
  constraint faultline_agent_insights_priorities_array check (jsonb_typeof(priorities) = 'array'),
  constraint faultline_agent_insights_evidence_array check (jsonb_typeof(evidence) = 'array')
);

create index faultline_ingestion_runs_started_idx
  on public.faultline_ingestion_runs (started_at desc, id desc);

create index faultline_signal_snapshots_source_time_idx
  on public.faultline_signal_snapshots (source, captured_at desc, id desc);

create index faultline_signal_snapshots_time_idx
  on public.faultline_signal_snapshots (captured_at desc, id desc);

create index faultline_observations_time_idx
  on public.faultline_observations (captured_at desc, id desc);

create index faultline_observations_source_status_idx
  on public.faultline_observations (source, status, captured_at desc);

create index faultline_agent_insights_time_idx
  on public.faultline_agent_insights (captured_at desc, id desc);

alter table public.faultline_ingestion_runs enable row level security;
alter table public.faultline_signal_snapshots enable row level security;
alter table public.faultline_observations enable row level security;
alter table public.faultline_agent_insights enable row level security;

revoke all on table public.faultline_ingestion_runs from public, anon, authenticated;
revoke all on table public.faultline_signal_snapshots from public, anon, authenticated;
revoke all on table public.faultline_observations from public, anon, authenticated;
revoke all on table public.faultline_agent_insights from public, anon, authenticated;

grant select on table public.faultline_ingestion_runs to anon, authenticated;
grant select on table public.faultline_signal_snapshots to anon, authenticated;
grant select on table public.faultline_observations to anon, authenticated;
grant select on table public.faultline_agent_insights to anon, authenticated;

create policy "Public can read live ingestion health"
on public.faultline_ingestion_runs for select to anon, authenticated using (true);

create policy "Public can read captured status snapshots"
on public.faultline_signal_snapshots for select to anon, authenticated using (true);

create policy "Public can read normalized live observations"
on public.faultline_observations for select to anon, authenticated using (true);

create policy "Public can read agent insights"
on public.faultline_agent_insights for select to anon, authenticated using (true);

alter publication supabase_realtime add table public.faultline_signal_snapshots;
alter publication supabase_realtime add table public.faultline_observations;
alter publication supabase_realtime add table public.faultline_agent_insights;

comment on table public.faultline_signal_snapshots is
  'Append-only captures of real public GitHub, Cloudflare, and npm service-status data.';

comment on table public.faultline_observations is
  'Normalized incident, degraded-component, and overall-status observations derived from live snapshots.';

comment on table public.faultline_agent_insights is
  'Evidence-linked live triage summaries; deterministic when no model credential is configured.';
