"use client";

import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { IngestionRun, LiveInsight, LiveObservation, LiveSnapshot } from "../lib/live-store";

type LivePayload = {
  sources: LiveSnapshot[];
  snapshots: LiveSnapshot[];
  observations: LiveObservation[];
  insight: LiveInsight | null;
  run: IngestionRun | null;
  capturedRows: { snapshots: number; observations: number; insights: number };
  realtime: { url: string; key: string };
};

const sourceNames = { github: "GitHub", cloudflare: "Cloudflare", npm: "npm" };

export function LivePulse() {
  const router = useRouter();
  const [payload, setPayload] = useState<LivePayload | null>(null);
  const [connection, setConnection] = useState<"connecting" | "live" | "polling" | "error">("connecting");
  const [creatingCase, setCreatingCase] = useState<string | null>(null);
  const [caseError, setCaseError] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch("/api/live-signals", { cache: "no-store" });
    if (!response.ok) throw new Error("Live feed unavailable");
    const next = await response.json() as LivePayload;
    setPayload(next);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let channel: RealtimeChannel | undefined;
    const start = async () => {
      try {
        const initial = await refresh();
        if (cancelled) return;
        const client = createClient(initial.realtime.url, initial.realtime.key, { auth: { persistSession: false, autoRefreshToken: false } });
        channel = client
          .channel("faultline-live-memory")
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "faultline_signal_snapshots" }, () => void refresh())
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "faultline_agent_insights" }, () => void refresh())
          .subscribe((status) => setConnection(status === "SUBSCRIBED" ? "live" : status === "CHANNEL_ERROR" || status === "TIMED_OUT" ? "polling" : "connecting"));
      } catch {
        if (!cancelled) setConnection("error");
      }
    };
    void start();
    const fallback = window.setInterval(() => void refresh().then(() => setConnection((state) => state === "live" ? state : "polling")).catch(() => setConnection("error")), 30_000);
    return () => { cancelled = true; window.clearInterval(fallback); if (channel) void channel.unsubscribe(); };
  }, [refresh]);

  const activeIncidents = useMemo(() => payload?.observations.filter((observation) => observation.kind === "incident") ?? [], [payload]);
  const degradedComponents = useMemo(() => payload?.observations.filter((observation) => observation.kind === "component") ?? [], [payload]);
  const newestCapture = payload?.sources.reduce<string | null>((latest, source) => !latest || source.captured_at > latest ? source.captured_at : latest, null);

  const openInvestigation = useCallback(async (snapshotId: number, observationId?: number) => {
    const requestKey = observationId ? `observation-${observationId}` : `snapshot-${snapshotId}`;
    setCreatingCase(requestKey);
    setCaseError("");
    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshotId, observationId }),
      });
      const result = await response.json() as { case?: { id: string }; error?: string };
      if (!response.ok || !result.case) throw new Error(result.error ?? "Unable to create the case");
      router.push(`/cases/${result.case.id}`);
    } catch (error) {
      setCaseError(error instanceof Error ? error.message : "Unable to create the case");
      setCreatingCase(null);
    }
  }, [router]);

  if (!payload && connection === "error") return <LiveState title="Live memory unavailable" copy="The observer will retry automatically while preserving previous captures in Supabase." />;
  if (!payload) return <LiveState title="Connecting to live signal memory" copy="Opening the latest captured GitHub, Cloudflare, and npm observations…" />;

  return <div className="live-pulse">
    <header className="live-pulse-title m-enter">
      <div><span className="minimal-chip live-chip">LIVE PULSE · PUBLIC STATUS DATA</span><h1>What the agent sees now.</h1><p>Real status signals are captured every two minutes and retained as append-only operational memory.</p></div>
      <div className="live-title-actions"><Link href="/evidence">How the evidence works</Link><div className={`live-connection live-${connection}`}><span /><div><strong>{connection === "live" ? "Realtime connected" : connection === "polling" ? "Polling fallback" : "Connecting"}</strong><small>{newestCapture ? `Latest capture ${relativeTime(newestCapture)}` : "Awaiting first capture"}</small></div></div></div>
    </header>

    {caseError && <div className="case-error" role="alert"><span>Case creation failed</span><p>{caseError}</p><button onClick={() => setCaseError("")}>Dismiss</button></div>}

    <section className="live-source-grid m-enter">
      {payload.sources.map((source) => <article key={source.id} className={`live-source-card live-indicator-${source.indicator}`}>
        <header><span>{sourceNames[source.source]}</span><b>{source.indicator}</b></header>
        <h2>{source.description}</h2>
        <div><span><strong>{source.active_incident_count}</strong><small>active incidents</small></span><span><strong>{source.degraded_component_count}</strong><small>degraded components</small></span><span><strong>{source.component_count}</strong><small>observed components</small></span></div>
        <footer><a href={source.source_url} target="_blank" rel="noreferrer">Source ↗</a><span>Captured {relativeTime(source.captured_at)}</span><button onClick={() => void openInvestigation(source.id)} disabled={creatingCase !== null}>{creatingCase === `snapshot-${source.id}` ? "Creating…" : "Investigate"}</button></footer>
      </article>)}
    </section>

    <section className="live-memory-grid m-enter">
      <div className="live-stream">
        <header><div><small>OBSERVATION STREAM</small><strong>Persisted evidence</strong></div><span>{payload.observations.length} current signals</span></header>
        <div className="live-stream-list">
          {[...activeIncidents, ...degradedComponents].slice(0, 18).map((observation) => <article key={observation.id}>
            <span className={`live-severity live-severity-${observation.severity}`} />
            <div><a href={observation.source_url} target="_blank" rel="noreferrer"><strong>{observation.title}</strong></a><small>{sourceNames[observation.source]} · {humanize(observation.status)} · {relativeTime(observation.captured_at)}</small></div>
            <button onClick={() => void openInvestigation(observation.snapshot_id, observation.id)} disabled={creatingCase !== null}>{creatingCase === `observation-${observation.id}` ? "Creating…" : "Open case"}</button>
          </article>)}
          {!activeIncidents.length && !degradedComponents.length && <div className="live-clear"><span>✓</span><strong>No degraded components in the latest capture</strong><small>The operational state is still recorded, hashed, and replayable.</small></div>}
        </div>
      </div>

      <aside className="live-agent-memory">
        <header><span>✦</span><div><small>LIVE AGENT MEMORY</small><strong>{payload.insight?.provider === "openai" && payload.insight.status === "completed" ? "Model-enriched triage" : "Deterministic observer"}</strong></div></header>
        <p>{payload.insight?.summary ?? "Awaiting the next ingestion summary."}</p>
        {!!payload.insight?.priorities.length && <ul>{payload.insight.priorities.map((priority) => <li key={priority}>{priority}</li>)}</ul>}
        <div className="live-memory-facts"><span><small>RUN STATUS</small><strong>{payload.run?.status ?? "unknown"}</strong></span><span><small>SOURCES</small><strong>{payload.run ? `${payload.run.sources_succeeded}/${payload.run.sources_attempted}` : "—"}</strong></span><span><small>PROVIDER</small><strong>{payload.insight?.model ?? payload.insight?.provider ?? "—"}</strong></span></div>
        <footer><span>Supabase memory</span><strong>{payload.snapshots.length} recent snapshots</strong></footer>
      </aside>
    </section>

    <section className="capture-history m-enter">
      <header><div><small>CAPTURE HISTORY</small><strong>What changed, and when</strong></div><span>append-only</span></header>
      <div>{payload.snapshots.slice(0, 15).map((snapshot) => <article key={snapshot.id}><span className={`history-dot live-indicator-${snapshot.indicator}`} /><div><strong>{sourceNames[snapshot.source]}</strong><small>{snapshot.description}</small></div><span>{formatTimestamp(snapshot.captured_at)}</span><code>{snapshot.content_hash.slice(0, 10)}</code></article>)}</div>
    </section>
  </div>;
}

function LiveState({ title, copy }: { title: string; copy: string }) {
  return <div className="minimal-state live-state"><span>◉</span><strong>{title}</strong><p>{copy}</p></div>;
}

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", month: "short", day: "numeric" }).format(new Date(value));
}

function humanize(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
