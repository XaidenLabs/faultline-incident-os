create schema if not exists private;
create extension if not exists pgcrypto with schema extensions;

create table private.faultline_agent_secrets (
  key_hash text primary key,
  label text not null,
  created_at timestamptz not null default now()
);

revoke all on table private.faultline_agent_secrets from public, anon, authenticated;

insert into private.faultline_agent_secrets (key_hash, label)
values ('5239ffa7fae84fc6a7a0ef9ff7b98298d4cdf7448f8ee295f7ededa895add5bd', 'Faultline Sites worker')
on conflict (key_hash) do nothing;

create or replace function private.is_faultline_agent()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.faultline_agent_secrets
    where key_hash = encode(
      extensions.digest(
        coalesce(current_setting('request.headers', true)::jsonb ->> 'x-faultline-agent-key', ''),
        'sha256'
      ),
      'hex'
    )
  );
$$;

revoke all on function private.is_faultline_agent() from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.is_faultline_agent() to anon, authenticated;

create table public.faultline_incidents (
  id text primary key,
  title text not null,
  symptom text not null,
  severity text not null check (severity in ('SEV-1', 'SEV-2', 'SEV-3')),
  peak_error_rate numeric(7, 2) not null check (peak_error_rate >= 0),
  service_count integer not null check (service_count > 0),
  topology jsonb not null default '[]'::jsonb,
  candidates jsonb not null default '[]'::jsonb,
  changes jsonb not null default '[]'::jsonb,
  allowed_action_count integer not null default 0 check (allowed_action_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint faultline_incidents_topology_array check (jsonb_typeof(topology) = 'array'),
  constraint faultline_incidents_candidates_array check (jsonb_typeof(candidates) = 'array'),
  constraint faultline_incidents_changes_array check (jsonb_typeof(changes) = 'array')
);

create table public.faultline_runs (
  id uuid primary key default gen_random_uuid(),
  incident_id text not null references public.faultline_incidents(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  attempt integer not null check (attempt > 0),
  claim_token uuid,
  result jsonb,
  error text,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint faultline_runs_completed_result check (status <> 'completed' or result is not null),
  constraint faultline_runs_running_claim check (status <> 'running' or claim_token is not null)
);

create unique index faultline_runs_one_active_per_incident_idx
  on public.faultline_runs (incident_id)
  where status in ('queued', 'running');

create index faultline_runs_incident_history_idx
  on public.faultline_runs (incident_id, queued_at desc);

create index faultline_runs_status_queue_idx
  on public.faultline_runs (status, queued_at asc);

alter table public.faultline_incidents enable row level security;
alter table public.faultline_runs enable row level security;

revoke all on table public.faultline_incidents from public, anon, authenticated;
revoke all on table public.faultline_runs from public, anon, authenticated;
grant select, insert, update on table public.faultline_incidents to anon, authenticated;
grant select, insert, update on table public.faultline_runs to anon, authenticated;

create policy "Faultline worker manages incidents"
on public.faultline_incidents
for all
to anon, authenticated
using ((select private.is_faultline_agent()))
with check ((select private.is_faultline_agent()));

create policy "Faultline worker manages runs"
on public.faultline_runs
for all
to anon, authenticated
using ((select private.is_faultline_agent()))
with check ((select private.is_faultline_agent()));

comment on table public.faultline_incidents is
  'Synthetic incident intake records mirrored by the autonomous Faultline worker.';

comment on table public.faultline_runs is
  'Persistent queue and proof history for autonomous Faultline investigations.';
