create table public.faultline_investigation_cases (
  id uuid primary key default gen_random_uuid(),
  case_key text not null unique,
  origin text not null check (origin in ('live_public_signal', 'external_ingest', 'synthetic_proof_case')),
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  title text not null check (char_length(title) between 1 and 240),
  summary text not null default '' check (char_length(summary) <= 4000),
  source_name text not null,
  source_url text,
  source_external_id text,
  source_snapshot_id bigint references public.faultline_signal_snapshots(id) on delete set null,
  source_observation_id bigint references public.faultline_observations(id) on delete set null,
  status text not null default 'captured' check (status in ('captured', 'triaged', 'needs_adapter', 'proof_ready', 'proved')),
  proof_status text not null default 'unavailable' check (proof_status in ('unavailable', 'ready', 'proved')),
  proof_reason text not null,
  safe_adapter_id text,
  evidence jsonb not null default '{}'::jsonb,
  hypotheses jsonb not null default '[]'::jsonb,
  content_hash text not null,
  captured_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint faultline_investigation_cases_evidence_object check (jsonb_typeof(evidence) = 'object'),
  constraint faultline_investigation_cases_hypotheses_array check (jsonb_typeof(hypotheses) = 'array')
);

create table public.faultline_case_events (
  id bigint generated always as identity primary key,
  case_id uuid not null references public.faultline_investigation_cases(id) on delete cascade,
  event_type text not null check (event_type in ('captured', 'normalized', 'triaged', 'adapter_check', 'proof_started', 'proof_completed')),
  title text not null,
  detail text not null default '',
  evidence jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint faultline_case_events_evidence_object check (jsonb_typeof(evidence) = 'object')
);

create index faultline_investigation_cases_public_time_idx
  on public.faultline_investigation_cases (visibility, created_at desc, id desc);

create index faultline_investigation_cases_snapshot_idx
  on public.faultline_investigation_cases (source_snapshot_id)
  where source_snapshot_id is not null;

create index faultline_investigation_cases_observation_idx
  on public.faultline_investigation_cases (source_observation_id)
  where source_observation_id is not null;

create index faultline_case_events_case_time_idx
  on public.faultline_case_events (case_id, occurred_at asc, id asc);

alter table public.faultline_investigation_cases enable row level security;
alter table public.faultline_case_events enable row level security;

revoke all on table public.faultline_investigation_cases from public, anon, authenticated;
revoke all on table public.faultline_case_events from public, anon, authenticated;

grant select on table public.faultline_investigation_cases to anon, authenticated;
grant select on table public.faultline_case_events to anon, authenticated;

create policy "Public can read public investigation cases"
on public.faultline_investigation_cases for select to anon, authenticated
using (visibility = 'public');

create policy "Public can read events for public investigation cases"
on public.faultline_case_events for select to anon, authenticated
using (
  exists (
    select 1
    from public.faultline_investigation_cases investigation_case
    where investigation_case.id = case_id
      and investigation_case.visibility = 'public'
  )
);

alter publication supabase_realtime add table public.faultline_investigation_cases;
alter publication supabase_realtime add table public.faultline_case_events;

comment on table public.faultline_investigation_cases is
  'Durable investigation intake records. Public cases contain public-source evidence only; external webhook cases remain private.';

comment on table public.faultline_case_events is
  'Append-only provenance, triage, adapter-readiness, and proof events for an investigation case.';
