"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { LivePulse } from "./LivePulse";

type View = "proof" | "recovery" | "postmortem" | "runbook";
type Mode = "live" | "proof-lab";
type RunState = "loading" | "idle" | "running" | "replaying" | "proved" | "error";
type InvestigationEnvelope = { status: "queued" | "running" | "completed"; persistence: "local" | "supabase"; runId?: string; attempt?: number; result?: InvestigationResult };

type Incident = {
  id: string;
  title: string;
  symptom: string;
  severity: string;
  peakErrorRate: number;
  serviceCount: number;
  topology: string[];
  candidates: { service: string; errorRate: number; signal: string }[];
  changes: string[];
  allowedActionCount: number;
};

type Experiment = {
  experimentId: string;
  hypothesis: string;
  action: string;
  verdict: string;
  before: { errorRatePct: number; healthScore: number };
  after: { errorRatePct: number; healthScore: number };
  effect: { symptomCleared: boolean; unrelatedRegressions: number; errorReductionPct: number };
};

type InvestigationResult = {
  incident: { id: string; title: string; symptom: string; severity: string; blastRadius: { serviceCount: number } };
  lifecycle: Record<string, string>;
  investigation: {
    rootService: string;
    confidence: number;
    rejectedHypotheses: string[];
    counterfactuals: Experiment[];
    trajectory: { actor: string; action: string; output: unknown }[];
  };
  baseline: { service: string; action: string | null };
  recovery: { action: string | null; target: string; status: string; risk: { level: string; reason: string }; approval: { status: string; role: string }; constraints: { productionExecuted: boolean } };
  rehearsal: { status: string; healthGates: { name: string; passed: boolean; observed: string }[]; before?: { errorRatePct: number }; after?: { errorRatePct: number } };
  postmortem: { summary: string; proof: string; alternativesRejected: { service: string; reason: string }[]; limitations: string[] };
  runbook: { id: string; status: string; trigger: string; verify: { acceptanceRule: string }; recover: { action: string | null; approvalRequired: boolean }; regressionTest: { assertion: string } | null };
  audit: { sha256: string; appendOnlyTrajectoryEvents: number };
};

export default function DashboardPage() {
  const rootRef = useRef<HTMLElement>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [mode, setMode] = useState<Mode>("live");
  const [selectedId, setSelectedId] = useState("");
  const [result, setResult] = useState<InvestigationResult | null>(null);
  const [runState, setRunState] = useState<RunState>("loading");
  const [view, setView] = useState<View>("proof");
  const [visibleEvents, setVisibleEvents] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [persistence, setPersistence] = useState<"local" | "supabase" | "degraded">("local");

  const selected = useMemo(() => incidents.find((incident) => incident.id === selectedId) ?? null, [incidents, selectedId]);
  const shownEvents = result?.investigation.trajectory.slice(0, visibleEvents) ?? [];
  const complete = runState === "proved" && result?.lifecycle.prove === "passed";

  const loadIncidents = useCallback(async () => {
    try {
      const response = await fetch("/api/incidents", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load incidents.");
      const payload = await response.json() as { incidents: Incident[]; persistence?: "local" | "supabase" | "degraded" };
      setIncidents(payload.incidents);
      setPersistence(payload.persistence ?? "local");
      setSelectedId(payload.incidents.at(-1)?.id ?? payload.incidents[0]?.id ?? "");
      setRunState("idle");
    } catch {
      setRunState("error");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/incidents", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load incidents.");
        return response.json() as Promise<{ incidents: Incident[]; persistence?: "local" | "supabase" | "degraded" }>;
      })
      .then((payload) => {
        if (cancelled) return;
        setIncidents(payload.incidents);
        setPersistence(payload.persistence ?? "local");
        setSelectedId(payload.incidents.at(-1)?.id ?? payload.incidents[0]?.id ?? "");
        setRunState("idle");
      })
      .catch(() => { if (!cancelled) setRunState("error"); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") !== "proof-lab") return;
    const timer = window.setTimeout(() => setMode("proof-lab"), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const investigateIncident = useCallback(async (incidentId: string, rerun = false, signal?: AbortSignal) => {
    setView("proof");
    setResult(null);
    setVisibleEvents(0);
    setRunState("running");
    for (let poll = 0; poll < 20; poll += 1) {
      const response = await fetch("/api/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId, rerun: rerun && poll === 0 }),
        signal,
      });
      if (!response.ok && response.status !== 202) throw new Error("Investigation failed.");
      const payload = await response.json() as InvestigationEnvelope;
      if (payload.persistence) setPersistence(payload.persistence);
      if (payload.status === "completed" && payload.result) {
        setResult(payload.result);
        setRunState("replaying");
        return;
      }
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(resolve, 650);
        signal?.addEventListener("abort", () => { window.clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
      });
    }
    throw new Error("Investigation timed out.");
  }, []);

  useEffect(() => {
    if (!selectedId || mode !== "proof-lab") return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void investigateIncident(selectedId, false, controller.signal).catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setRunState("error");
      });
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [investigateIncident, mode, selectedId]);

  useEffect(() => {
    const context = gsap.context(() => gsap.from(".m-enter", { opacity: 0, y: 12, duration: .55, stagger: .04, ease: "power3.out" }), rootRef);
    return () => context.revert();
  }, []);

  useEffect(() => {
    if (runState !== "replaying" || !result) return;
    if (visibleEvents >= result.investigation.trajectory.length) {
      const done = window.setTimeout(() => setRunState("proved"), 250);
      return () => window.clearTimeout(done);
    }
    const timer = window.setTimeout(() => setVisibleEvents((value) => value + 1), 170);
    return () => window.clearTimeout(timer);
  }, [result, runState, visibleEvents]);

  useEffect(() => {
    if (!navOpen && !copilotOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNavOpen(false);
        setCopilotOpen(false);
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [copilotOpen, navOpen]);

  async function rerunInvestigation() {
    if (!selected) return;
    try {
      await investigateIncident(selected.id, true);
    } catch {
      setRunState("error");
    }
  }

  function chooseIncident(id: string) {
    setMode("proof-lab");
    setSelectedId(id);
    setResult(null);
    setVisibleEvents(0);
    setRunState("running");
    setView("proof");
    setNavOpen(false);
  }

  const closeDrawers = () => { setNavOpen(false); setCopilotOpen(false); };

  return (
    <main ref={rootRef} className="minimal-dashboard">
      <button className={`drawer-backdrop ${navOpen || copilotOpen ? "show" : ""}`} onClick={closeDrawers} aria-label="Close navigation drawers" />

      <aside className={`minimal-rail ${navOpen ? "drawer-open" : ""}`}>
        <div className="minimal-brand"><Link href="/">✦ <span>Faultline</span></Link><button onClick={() => setNavOpen(false)} aria-label="Close menu">×</button></div>
        <nav className="minimal-nav">
          <small>WORKSPACE</small>
          <button className={mode === "live" ? "active" : ""} onClick={() => { setMode("live"); setNavOpen(false); }}>◉ <span>Live pulse</span></button>
          <button className={mode === "proof-lab" && view === "proof" ? "active" : ""} onClick={() => { setMode("proof-lab"); setView("proof"); setNavOpen(false); }}>⌁ <span>Counterfactual lab</span></button>
          <Link href="/evidence">◎ <span>Evidence & method</span></Link>
          <Link href="/docs">? <span>Plain-language guide</span></Link>
          <small>PROOF ARTIFACTS</small>
          <button className={mode === "proof-lab" && view === "recovery" ? "active" : ""} onClick={() => { setMode("proof-lab"); setView("recovery"); setNavOpen(false); }}>↺ <span>Recovery</span></button>
          <button className={mode === "proof-lab" && view === "postmortem" ? "active" : ""} onClick={() => { setMode("proof-lab"); setView("postmortem"); setNavOpen(false); }}>▤ <span>Postmortem</span></button>
          <button className={mode === "proof-lab" && view === "runbook" ? "active" : ""} onClick={() => { setMode("proof-lab"); setView("runbook"); setNavOpen(false); }}>◇ <span>Runbook</span></button>
        </nav>
        {mode === "proof-lab" && <div className="minimal-incidents"><small>PROOF CASES · {incidents.length}</small>{incidents.map((incident) => <button key={incident.id} className={incident.id === selectedId ? "active" : ""} onClick={() => chooseIncident(incident.id)}><span className={`severity severity-${incident.severity.at(-1)}`} /><div><strong>{incident.id}</strong><small>{incident.title}</small></div></button>)}</div>}
        <div className="isolation-note"><span>✓</span><div><strong>{mode === "live" ? "Read-only observer" : "Safe counterfactual lab"}</strong><small>{mode === "live" ? "Public evidence · no external actions" : "Fixed test cases · no production access"}</small></div></div>
      </aside>

      <section className="minimal-main">
        <header className="minimal-topbar">
          <div><button className="drawer-toggle nav-toggle" onClick={() => setNavOpen(true)} aria-label="Open incident navigation">☰</button><span className="status-orb" /><strong>Faultline</strong><small>/ {mode === "live" ? "LIVE" : selected?.id ?? "COUNTERFACTUAL LAB"}</small></div>
          <div><button className="drawer-toggle" onClick={() => setCopilotOpen(true)} aria-label="Open investigation summary">✦</button><span className="dash-avatar">AD</span></div>
        </header>

        <div className="minimal-content">
          {mode === "live" ? <LivePulse /> : <>
          {runState === "loading" && <DashboardState title="Loading incidents" copy="Reading the versioned incident dataset…" />}
          {runState === "error" && <DashboardState title="The agent lost its connection" copy="Retry to resume this incident from its persisted queue state." action="Retry" onAction={() => selected ? void investigateIncident(selected.id).catch(() => setRunState("error")) : void loadIncidents()} />}
          {selected && runState !== "loading" && runState !== "error" && <>
            <header className="minimal-title m-enter"><div><span className="minimal-chip">{selected.severity} · FIXED COUNTERFACTUAL CASE</span><h1>{selected.title}</h1><p>{selected.symptom} This controlled case can be reset and tested without touching production.</p></div><div className="agent-control"><div className="agent-live"><span /><div><strong>{runState === "running" ? "Agent investigating" : runState === "replaying" ? "Compiling proof" : complete ? "Agent complete" : "Agent standing by"}</strong><small>{persistence === "supabase" ? "Persistent queue · Supabase" : persistence === "degraded" ? "Persistence degraded" : "Ephemeral local run"}</small></div></div><button className="minimal-rerun" onClick={() => void rerunInvestigation()} disabled={runState === "running" || runState === "replaying"}>Re-run</button></div></header>

            <section className="minimal-metrics m-enter">
              <article><small>PEAK SIGNAL</small><strong>{selected.peakErrorRate}%</strong><span>visible error rate</span></article>
              <article><small>FAULT SURFACE</small><strong>{selected.serviceCount}</strong><span>connected services</span></article>
              <article><small>PROOF</small><strong>{complete ? "Passed" : result ? "Verifying" : "Unproven"}</strong><span>{result ? `${result.investigation.counterfactuals.length} experiment(s)` : `${selected.allowedActionCount} allowed action(s)`}</span></article>
            </section>

            <SignalChart candidates={selected.candidates} provenService={complete ? result?.investigation.rootService : undefined} />

            <div className="minimal-tabs m-enter">{(["proof", "recovery", "postmortem", "runbook"] as View[]).map((item) => <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}>{item}</button>)}</div>

            {view === "proof" && <ProofView incident={selected} result={result} shownEvents={shownEvents} complete={Boolean(complete)} runState={runState} />}
            {view !== "proof" && <ArtifactView view={view} result={result} />}
          </>}
          </>}
        </div>
      </section>

      <aside className={`minimal-copilot ${copilotOpen ? "drawer-open" : ""}`}>
        <header><div><span className="copilot-orb">✦</span><div><strong>{mode === "live" ? "Live observer" : "Investigation summary"}</strong><small>{mode === "live" ? "REALTIME MEMORY" : selected?.id ?? "No incident selected"}</small></div></div><button onClick={() => setCopilotOpen(false)} aria-label="Close investigation summary">×</button></header>
        <section className="copilot-summary"><small>STATUS</small><strong>{mode === "live" ? "Watching public signals" : complete ? "Cause proven" : result ? "Proof in progress" : runState === "running" ? "Agent investigating" : "Agent standing by"}</strong><p>{mode === "live" ? "New GitHub, Cloudflare, and npm captures are written to Supabase every two minutes. Open Live Pulse to inspect the retained evidence." : result?.postmortem.proof ?? selected?.symptom ?? "Select an incident to begin."}</p></section>
        {mode === "proof-lab" && result && <>
          <section className="copilot-facts"><div><small>ROOT SERVICE</small><strong>{result.investigation.rootService}</strong></div><div><small>CONFIDENCE</small><strong>{result.investigation.confidence}%</strong></div></section>
          <section className="copilot-action"><small>PROPOSED RECOVERY</small><strong>{result.recovery.action ?? "Blocked"}</strong><span>{result.recovery.approval.status}</span></section>
        </>}
        <div className="copilot-boundary"><small>{mode === "live" ? "EVIDENCE BOUNDARY" : "TEST BOUNDARY"}</small><strong>{mode === "live" ? "Reports only what public sources say" : "Runs only inside fixed isolated cases"}</strong><Link href="/evidence">See what is real, tested, and limited →</Link></div>
      </aside>
    </main>
  );
}

function SignalChart({ candidates, provenService }: { candidates: Incident["candidates"]; provenService?: string }) {
  const maxRate = Math.max(...candidates.map((candidate) => candidate.errorRate), 1);
  return <section className="minimal-signal-chart m-enter" aria-label="Candidate service error rates">
    <header><div><small>FAULT-SURFACE SIGNAL</small><strong>Visible errors by candidate service</strong></div><span>{candidates.length} candidates</span></header>
    <div className="signal-bars">{candidates.map((candidate) => {
      const height = Math.max(8, (candidate.errorRate / maxRate) * 100);
      const proven = candidate.service === provenService;
      return <div className={`signal-column ${proven ? "signal-proven" : ""}`} key={candidate.service} title={candidate.signal}><div className="signal-value" style={{ "--bar-height": `${height}%` } as CSSProperties}><span>{candidate.errorRate}%</span><i style={{ height: `${height}%` }} /></div><strong>{candidate.service}</strong>{proven && <small>PROVEN</small>}</div>;
    })}</div>
  </section>;
}

function ProofView({ incident, result, shownEvents, complete, runState }: { incident: Incident; result: InvestigationResult | null; shownEvents: InvestigationResult["investigation"]["trajectory"]; complete: boolean; runState: RunState }) {
  return <section className="minimal-proof m-enter">
    {!result && runState !== "running" ? <DashboardState title="Agent standing by" copy={`New evidence for ${incident.id} will automatically queue another investigation.`} /> : runState === "running" ? <DashboardState title="Agent investigation in progress" copy={`Testing ${incident.candidates.length} competing hypotheses in isolated counterfactual snapshots—no click required.`} /> : <>
      <div className="proof-outcome"><div><small>DIRECT BASELINE</small><strong>{result?.baseline.service ?? "—"}</strong><span>highest visible error</span></div><b>→</b><div><small>CAUSAL DIAGNOSIS</small><strong>{result?.investigation.rootService ?? "—"}</strong><span className={complete ? "good" : "muted"}>{complete ? "experimentally proven" : "verifying trajectory"}</span></div></div>
      <div className="experiment-list">{result?.investigation.counterfactuals.map((experiment) => <article key={experiment.experimentId}><div><small>{experiment.experimentId}</small><strong>{experiment.action}</strong><span>{experiment.hypothesis} hypothesis</span></div><div className="experiment-change"><small>ERROR RATE</small><strong>{experiment.before.errorRatePct}% <b>→</b> {experiment.after.errorRatePct}%</strong></div><span className={experiment.verdict === "causal" ? "experiment-causal" : "experiment-rejected"}>{experiment.verdict}</span></article>)}</div>
      <div className="minimal-trajectory"><header><strong>Inspectable trajectory</strong><span>{shownEvents.length} / {result?.investigation.trajectory.length ?? 0}</span></header>{shownEvents.map((event, index) => <article key={`${event.action}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{humanize(event.action)}</strong><small>{event.actor}</small></div></article>)}</div>
    </>}
  </section>;
}

function ArtifactView({ view, result }: { view: Exclude<View, "proof">; result: InvestigationResult | null }) {
  if (!result) return <section className="minimal-artifact m-enter"><DashboardState title="Agent is preparing this artifact" copy={`The ${view} view will appear automatically when causal proof is complete.`} /></section>;
  const data = artifactData(view, result);
  return <section className="minimal-artifact m-enter"><header><div><small>{data.eyebrow}</small><h2>{data.title}</h2></div><span>{data.status}</span></header><div className="artifact-grid">{data.items.map((item) => <article key={item.label}><small>{item.label}</small><strong>{item.value}</strong><p>{item.copy}</p></article>)}</div></section>;
}

function DashboardState({ title, copy, action, onAction }: { title: string; copy: string; action?: string; onAction?: () => void }) {
  return <div className="minimal-state"><span>✦</span><strong>{title}</strong><p>{copy}</p>{action && <button onClick={onAction}>{action}</button>}</div>;
}

function artifactData(view: Exclude<View, "proof">, result: InvestigationResult) {
  if (view === "recovery") return { eyebrow: "RECOVERY PLAN", title: result.recovery.action ?? "Recovery blocked", status: result.rehearsal.status, items: result.rehearsal.healthGates.map((gate) => ({ label: humanize(gate.name), value: gate.passed ? "Pass" : "Fail", copy: gate.observed })) };
  if (view === "postmortem") return { eyebrow: "POSTMORTEM", title: result.postmortem.summary, status: "evidence-backed", items: [{ label: "Causal proof", value: result.investigation.rootService, copy: result.postmortem.proof }, ...result.postmortem.alternativesRejected.map((item) => ({ label: "Rejected alternative", value: item.service, copy: item.reason })), { label: "Audit", value: `${result.audit.appendOnlyTrajectoryEvents} events`, copy: result.audit.sha256.slice(0, 24) }] };
  return { eyebrow: "RUNBOOK MEMORY", title: result.runbook.id, status: result.runbook.status, items: [{ label: "Trigger", value: result.investigation.rootService, copy: result.runbook.trigger }, { label: "Acceptance rule", value: "Health gated", copy: result.runbook.verify.acceptanceRule }, { label: "Recovery", value: result.runbook.recover.action ?? "Blocked", copy: `Approval required: ${result.runbook.recover.approvalRequired}` }, { label: "Regression test", value: result.runbook.status, copy: result.runbook.regressionTest?.assertion ?? "No assertion compiled" }] };
}

function humanize(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
