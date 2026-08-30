create index faultline_signal_snapshots_run_idx
  on public.faultline_signal_snapshots (run_id);

create index faultline_observations_snapshot_idx
  on public.faultline_observations (snapshot_id);

create index faultline_agent_insights_run_idx
  on public.faultline_agent_insights (run_id);
