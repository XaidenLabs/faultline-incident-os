"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";

type View = "proof" | "recovery" | "postmortem" | "runbook";
type RunState = "loading" | "idle" | "running" | "replaying" | "proved" | "error";

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
  const [selectedId, setSelectedId] = useState("");
  const [result, setResult] = useState<InvestigationResult | null>(null);
  const [runState, setRunState] = useState<RunState>("loading");
  const [view, setView] = useState<View>("proof");
  const [visibleEvents, setVisibleEvents] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  const selected = useMemo(() => incidents.find((incident) => incident.id === selectedId) ?? null, [incidents, selectedId]);
  const shownEvents = result?.investigation.trajectory.slice(0, visibleEvents) ?? [];
  const complete = runState === "proved" && result?.lifecycle.prove === "passed";

  const loadIncidents = useCallback(async () => {
    try {
      const response = await fetch("/api/incidents", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load incidents.");
      const payload = await response.json() as { incidents: Incident[] };
      setIncidents(payload.incidents);
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
        return response.json() as Promise<{ incidents: Incident[] }>;
      })
      .then((payload) => {
        if (cancelled) return;
        setIncidents(payload.incidents);
        setSelectedId(payload.incidents.at(-1)?.id ?? payload.incidents[0]?.id ?? "");
        setRunState("idle");
      })
      .catch(() => { if (!cancelled) setRunState("error"); });
    return () => { cancelled = true; };
  }, []);

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

  async function runInvestigation() {
    if (!selected) return;
    setView("proof");
    setResult(null);
    setVisibleEvents(0);
    setRunState("running");
    try {
      const response = await fetch("/api/investigate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ incidentId: selected.id }) });
      if (!response.ok) throw new Error("Investigation failed.");
      setResult(await response.json() as InvestigationResult);
      setRunState("replaying");
    } catch {
      setRunState("error");
    }
  }

  function chooseIncident(id: string) {
    setSelectedId(id);
    setResult(null);
    setVisibleEvents(0);
    setRunState("idle");
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
          <button className={view === "proof" ? "active" : ""} onClick={() => { setView("proof"); setNavOpen(false); }}>◉ <span>Investigation</span></button>
          <button className={view === "recovery" ? "active" : ""} onClick={() => { setView("recovery"); setNavOpen(false); }}>↺ <span>Recovery</span></button>
          <button className={view === "postmortem" ? "active" : ""} onClick={() => { setView("postmortem"); setNavOpen(false); }}>▤ <span>Postmortem</span></button>
          <button className={view === "runbook" ? "active" : ""} onClick={() => { setView("runbook"); setNavOpen(false); }}>◇ <span>Runbook</span></button>
        </nav>
        <div className="minimal-incidents"><small>INCIDENTS · {incidents.length}</small>{incidents.map((incident) => <button key={incident.id} className={incident.id === selectedId ? "active" : ""} onClick={() => chooseIncident(incident.id)}><span className={`severity severity-${incident.severity.at(-1)}`} /><div><strong>{incident.id}</strong><small>{incident.title}</small></div></button>)}</div>
        <div className="isolation-note"><span>✓</span><div><strong>Simulation only</strong><small>No production connection</small></div></div>
      </aside>

      <section className="minimal-main">
        <header className="minimal-topbar">
          <div><button className="drawer-toggle nav-toggle" onClick={() => setNavOpen(true)} aria-label="Open incident navigation">☰</button><span className="status-orb" /><strong>Faultline</strong>{selected && <small>/ {selected.id}</small>}</div>
          <div><button className="drawer-toggle" onClick={() => setCopilotOpen(true)} aria-label="Open proof copilot">✦</button><span className="dash-avatar">AD</span></div>
        </header>

        <div className="minimal-content">
          {runState === "loading" && <DashboardState title="Loading incidents" copy="Reading the versioned incident dataset…" />}
          {runState === "error" && <DashboardState title="The dashboard could not load" copy="Retry the data connection to continue." action="Retry" onAction={() => void loadIncidents()} />}
          {selected && runState !== "loading" && runState !== "error" && <>
            <header className="minimal-title m-enter"><div><span className="minimal-chip">{selected.severity} · ISOLATED REPLAY</span><h1>{selected.title}</h1><p>{selected.symptom}</p></div><button className="minimal-run" onClick={() => void runInvestigation()} disabled={runState === "running" || runState === "replaying"}>{runState === "running" ? "Running engine…" : runState === "replaying" ? "Building proof…" : result ? "Run again" : "Investigate"}<span>→</span></button></header>

            <section className="minimal-metrics m-enter">
              <article><small>PEAK SIGNAL</small><strong>{selected.peakErrorRate}%</strong><span>visible error rate</span></article>
              <article><small>FAULT SURFACE</small><strong>{selected.serviceCount}</strong><span>connected services</span></article>
              <article><small>PROOF</small><strong>{complete ? "Passed" : result ? "Verifying" : "Unproven"}</strong><span>{result ? `${result.investigation.counterfactuals.length} experiment(s)` : `${selected.allowedActionCount} allowed action(s)`}</span></article>
            </section>

            <div className="minimal-tabs m-enter">{(["proof", "recovery", "postmortem", "runbook"] as View[]).map((item) => <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}>{item}</button>)}</div>

            {view === "proof" && <ProofView incident={selected} result={result} shownEvents={shownEvents} complete={Boolean(complete)} runState={runState} />}
            {view !== "proof" && <ArtifactView view={view} result={result} onRun={() => void runInvestigation()} />}
          </>}
        </div>
      </section>

      <aside className={`minimal-copilot ${copilotOpen ? "drawer-open" : ""}`}>
        <header><div><span className="copilot-orb">✦</span><div><strong>Proof copilot</strong><small>{selected?.id ?? "No incident selected"}</small></div></div><button onClick={() => setCopilotOpen(false)} aria-label="Close copilot">×</button></header>
        <section className="copilot-summary"><small>STATUS</small><strong>{complete ? "Cause proven" : result ? "Proof in progress" : "Awaiting investigation"}</strong><p>{result?.postmortem.proof ?? selected?.symptom ?? "Select an incident to begin."}</p></section>
        {result && <>
          <section className="copilot-facts"><div><small>ROOT SERVICE</small><strong>{result.investigation.rootService}</strong></div><div><small>CONFIDENCE</small><strong>{result.investigation.confidence}%</strong></div></section>
          <section className="copilot-action"><small>PROPOSED RECOVERY</small><strong>{result.recovery.action ?? "Blocked"}</strong><span>{result.recovery.approval.status}</span></section>
        </>}
        <div className="copilot-input"><textarea aria-label="Ask Proof Copilot" placeholder="Ask about the active proof…" /><button aria-label="Send message">↑</button></div>
      </aside>
    </main>
  );
}

function ProofView({ incident, result, shownEvents, complete, runState }: { incident: Incident; result: InvestigationResult | null; shownEvents: InvestigationResult["investigation"]["trajectory"]; complete: boolean; runState: RunState }) {
  return <section className="minimal-proof m-enter">
    {!result && runState !== "running" ? <DashboardState title="Ready to prove the cause" copy={`Faultline will test ${incident.candidates.length} competing service hypotheses using fresh isolated snapshots.`} /> : runState === "running" ? <DashboardState title="Investigation engine running" copy="Retrieving the bounded incident bundle and preparing counterfactual tools…" /> : <>
      <div className="proof-outcome"><div><small>DIRECT BASELINE</small><strong>{result?.baseline.service ?? "—"}</strong><span>highest visible error</span></div><b>→</b><div><small>CAUSAL DIAGNOSIS</small><strong>{result?.investigation.rootService ?? "—"}</strong><span className={complete ? "good" : "muted"}>{complete ? "experimentally proven" : "verifying trajectory"}</span></div></div>
      <div className="experiment-list">{result?.investigation.counterfactuals.map((experiment) => <article key={experiment.experimentId}><div><small>{experiment.experimentId}</small><strong>{experiment.action}</strong><span>{experiment.hypothesis} hypothesis</span></div><div className="experiment-change"><small>ERROR RATE</small><strong>{experiment.before.errorRatePct}% <b>→</b> {experiment.after.errorRatePct}%</strong></div><span className={experiment.verdict === "causal" ? "experiment-causal" : "experiment-rejected"}>{experiment.verdict}</span></article>)}</div>
      <div className="minimal-trajectory"><header><strong>Inspectable trajectory</strong><span>{shownEvents.length} / {result?.investigation.trajectory.length ?? 0}</span></header>{shownEvents.map((event, index) => <article key={`${event.action}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{humanize(event.action)}</strong><small>{event.actor}</small></div></article>)}</div>
    </>}
  </section>;
}

function ArtifactView({ view, result, onRun }: { view: Exclude<View, "proof">; result: InvestigationResult | null; onRun: () => void }) {
  if (!result) return <section className="minimal-artifact m-enter"><DashboardState title="Investigation required" copy={`Run the incident before opening its ${view} artifact.`} action="Run investigation" onAction={onRun} /></section>;
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
