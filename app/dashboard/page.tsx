"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

type RunState = "idle" | "running" | "proved";
type View = "proof" | "recovery" | "postmortem" | "runbook";

const events = [
  ["T-01", "Mapped the fault surface", "6 sources · 4 service paths"],
  ["T-02", "Opened competing hypotheses", "Checkout · Payment · Network"],
  ["CF-01", "Rolled back checkout canary", "19% → 19% · rejected"],
  ["CF-02", "Rerouted affected zone", "19% → 0.8% · causal"],
];

export default function DashboardPage() {
  const rootRef = useRef<HTMLElement>(null);
  const [runState, setRunState] = useState<RunState>("idle");
  const [view, setView] = useState<View>("proof");
  const [visibleEvents, setVisibleEvents] = useState(0);

  useEffect(() => {
    const context = gsap.context(() => {
      gsap.from(".dash-animate", { opacity: 0, y: 16, duration: 0.7, stagger: 0.055, ease: "power3.out" });
    }, rootRef);
    return () => context.revert();
  }, []);

  useEffect(() => {
    if (runState !== "running") return;
    if (visibleEvents >= events.length) {
      const done = window.setTimeout(() => setRunState("proved"), 450);
      return () => window.clearTimeout(done);
    }
    const timer = window.setTimeout(() => setVisibleEvents((value) => value + 1), 650);
    return () => window.clearTimeout(timer);
  }, [runState, visibleEvents]);

  function runInvestigation() {
    setView("proof");
    setVisibleEvents(0);
    setRunState("running");
  }

  const complete = runState === "proved";

  return (
    <main ref={rootRef} className="dashboard-shell">
      <aside className="dash-sidebar">
        <div className="dash-brand"><Link href="/"><span>✦</span> F</Link><button aria-label="Collapse navigation">⌁</button></div>
        <label className="dash-search">⌕ <input aria-label="Search incidents" placeholder="Search incidents" /><kbd>⌘K</kbd></label>
        <nav className="dash-nav">
          <small>COMMAND CENTER</small>
          <button className="active"><span>◉</span> Live incident</button>
          <button><span>⌁</span> Fault surface</button>
          <button><span>◇</span> Evaluations</button>
          <small>OPERATIONS</small>
          <button onClick={() => setView("recovery")}><span>↺</span> Recovery lab</button>
          <button onClick={() => setView("postmortem")}><span>▤</span> Postmortems</button>
          <button onClick={() => setView("runbook")}><span>⌘</span> Runbook memory</button>
        </nav>
        <div className="incident-history">
          <small>INCIDENT HISTORY</small>
          {["Today", "Yesterday", "3 days ago", "7 days ago"].map((date, index) => <div key={date}><span>{date}</span><button><b>{index === 0 ? "INC-2492" : `INC-${2488 - index}`}</b><small>{index === 0 ? "Packet loss in eu-south" : "Resolved incident package"}</small></button></div>)}
        </div>
        <div className="dash-upgrade"><div className="bot-face">✦</div><small>SIMULATION MODE</small><strong>Every action stays isolated</strong><p>Production requires a qualified human approver.</p><span>0 external writes</span></div>
      </aside>

      <section className="dash-main">
        <header className="dash-topbar"><div><span className="status-orb" /> <strong>Faultline OS</strong><small>/ INC-2492</small></div><div><button>Share proof</button><span className="dash-avatar">AD</span></div></header>

        <div className="dash-content">
          <div className="dash-title dash-animate"><div><span className="live-chip">SEV-2 · LIVE SIMULATION</span><h1>Regional packet loss</h1><p>Multi-service failures across eu-south with an unrelated checkout canary.</p></div><button className="run-button" onClick={runInvestigation} disabled={runState === "running"}>{runState === "running" ? "Investigating…" : complete ? "Run again" : "Run investigation"}<span>→</span></button></div>

          <section className="incident-card dash-animate">
            <div className="incident-card-head"><div><span className="service-icon">N</span><span><strong>INC-2492</strong><small>EU-SOUTH / DISTRIBUTED SERVICES</small></span></div><div><b className="metric-up">19.0% ERRORS</b><button>•••</button></div></div>
            <div className="incident-snapshot">
              <div><small>BLAST RADIUS</small><strong>4 services</strong><span>shared zone path</span></div>
              <div><small>FIRST ANOMALY</small><strong>14:07:12</strong><span>network edge</span></div>
              <div><small>RECENT CHANGE</small><strong>Checkout v47</strong><span>80 sec before alert</span></div>
              <div><small>PROOF STATUS</small><strong>{complete ? "Causal" : runState === "running" ? "Testing" : "Unproven"}</strong><span>{complete ? "CF-02 passed" : "awaiting run"}</span></div>
            </div>
            <div className="signal-chart" aria-label="Incident error rate chart">
              <div className="chart-grid"><i /><i /><i /><i /></div>
              <div className="chart-area"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>
              <div className="chart-marker"><b>CHECKOUT CANARY</b><span /></div>
              <div className="chart-labels"><span>14:02</span><span>14:07</span><span>14:12</span><span>14:17</span><span>NOW</span></div>
            </div>
          </section>

          <div className="dash-tabs dash-animate">{(["proof", "recovery", "postmortem", "runbook"] as View[]).map((item) => <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}>{item === "proof" ? "Causal proof" : item === "runbook" ? "Runbook memory" : item}</button>)}</div>

          {view === "proof" && <section className="proof-workspace dash-animate">
            <div className="metric-row"><article><small>BASELINE DIAGNOSIS</small><strong>Checkout</strong><span className="bad">Wrong</span></article><article><small>FAULTLINE DIAGNOSIS</small><strong>{complete ? "Network" : "—"}</strong><span className={complete ? "good" : "muted"}>{complete ? "Proven" : "Pending"}</span></article><article><small>ERROR RATE</small><strong>{complete ? "0.8%" : "19.0%"}</strong><span className={complete ? "good" : "bad"}>{complete ? "↓ 18.2 pts" : "Above SLO"}</span></article><article><small>EXPERIMENTS</small><strong>{complete ? "2" : visibleEvents > 2 ? "1" : "0"}</strong><span className="muted">fresh snapshots</span></article></div>
            <div className="trajectory-console">
              <div className="console-head"><div><button className="active">Trajectory</button><button>Evidence</button><button>Topology</button></div><span>APPEND-ONLY</span></div>
              <div className="event-list">{runState === "idle" ? <div className="console-empty"><span>✦</span><strong>Ready to investigate</strong><p>Run the incident to watch hypotheses become executable proof.</p></div> : events.slice(0, visibleEvents).map((event, index) => <article key={event[0]}><span className={index > 1 ? index === 2 ? "event-reject" : "event-pass" : ""}>{event[0]}</span><div><strong>{event[1]}</strong><small>{event[2]}</small></div><b>{index === 2 ? "REJECTED" : index === 3 ? "CAUSAL" : "VERIFIED"}</b></article>)}</div>
            </div>
          </section>}

          {view === "recovery" && <OperationalView eyebrow="RECOVERY LAB" title="Rehearse the fix before production" cards={[["ACTION", "network:reroute-zone", "Catalog-bound and reversible"], ["RISK", "Medium", "Shared infrastructure change"], ["HEALTH GATES", "4 / 4 pass", "No unrelated regressions"], ["APPROVAL", "Awaiting human", "Production not touched"]]} />}
          {view === "postmortem" && <OperationalView eyebrow="EVIDENCE-BACKED POSTMORTEM" title="The hard case becomes retained learning" cards={[["CAUSE", "Regional packet loss", "Shared across unrelated paths"], ["REJECTED", "Checkout canary", "Rollback left errors at 19%"], ["PROOF", "Network reroute", "Errors fell to 0.8%"], ["INTEGRITY", "SHA-256 sealed", "Trajectory is append-only"]]} />}
          {view === "runbook" && <OperationalView eyebrow="RUNBOOK MEMORY" title="Resolution compiled into a regression guard" cards={[["TRIGGER", "Cross-service zone loss", "Topology intersection required"], ["VERIFY", "Run isolated reroute", "Require errors below 1%"], ["RECOVER", "Propose zone reroute", "Human approval required"], ["REGRESSION", "RB-2492-NETWORK", "Machine-readable assertion"]]} />}
        </div>
      </section>

      <aside className="copilot-panel">
        <header><div><span className="copilot-orb">✦</span><span><strong>Proof copilot</strong><small>Grounded in this incident</small></span></div><button>×</button></header>
        <div className="copilot-tabs"><button className="active">Copilot</button><button>Tools</button></div>
        <section className="copilot-glow"><span>COUNTERFACTUAL STATUS</span><strong>{complete ? "Cause proven" : "Awaiting experiment"}</strong><p>{complete ? "The checkout rollback failed. Network rerouting cleared every affected path." : "Run the investigation to test the obvious explanation before trusting it."}</p></section>
        <section className="suggestions"><small>SUGGESTED ACTIONS</small>{["Explain the causal proof", "Show rejected hypothesis", "Inspect recovery gates", "Compile executive summary"].map((item) => <button key={item}>{item}<span>↗</span></button>)}</section>
        <section className="action-queue"><small>ACTION QUEUE</small><div><span className="queue-icon">↺</span><div><strong>network:reroute-zone</strong><small>Requires on-call approval</small></div></div><div className="queue-status"><span /> Sandbox passed · Production locked</div></section>
        <div className="copilot-input"><textarea aria-label="Ask Proof Copilot" placeholder="Ask about this incident…" /><div><button>＋ Attach</button><button className="send-button">↑</button></div></div>
      </aside>
    </main>
  );
}

function OperationalView({ eyebrow, title, cards }: { eyebrow: string; title: string; cards: string[][] }) {
  return <section className="operational-view dash-animate"><div className="operational-head"><div><small>{eyebrow}</small><h2>{title}</h2></div><button>Export artifact ↗</button></div><div className="operational-cards">{cards.map(([label, value, copy], index) => <article key={label}><span>0{index + 1}</span><small>{label}</small><strong>{value}</strong><p>{copy}</p></article>)}</div><div className="audit-banner"><span>✓</span><div><strong>Operational artifact complete</strong><small>Source-linked · production isolated · human controlled</small></div><button>Open audit package</button></div></section>;
}
