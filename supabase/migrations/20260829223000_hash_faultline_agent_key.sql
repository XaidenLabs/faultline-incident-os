create extension if not exists pgcrypto with schema extensions;

drop table if exists private.faultline_agent_secrets;

create table private.faultline_agent_secrets (
  key_hash text primary key,
  label text not null,
  created_at timestamptz not null default now()
);

revoke all on table private.faultline_agent_secrets from public, anon, authenticated;

insert into private.faultline_agent_secrets (key_hash, label)
values ('5239ffa7fae84fc6a7a0ef9ff7b98298d4cdf7448f8ee295f7ededa895add5bd', 'Faultline Sites worker');

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
grant execute on function private.is_faultline_agent() to anon, authenticated;
