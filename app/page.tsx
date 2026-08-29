"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

type Phase = "idle" | "running" | "ready" | "recovering" | "resolved";
type Panel = "investigation" | "trajectory" | "recovery" | "postmortem" | "runbook" | "benchmark";

type TraceStep = {
  id: string;
  actor: "investigator" | "tool" | "verifier";
  title: string;
  detail: string;
  evidence?: string;
  kind: "observe" | "query" | "reason" | "challenge" | "confirm";
};

const steps: TraceStep[] = [
  {
    id: "T-01",
    actor: "tool",
    title: "Mapped the fault surface",
    detail: "Checkout failures begin at 14:07:12 UTC and fan out through payment, email and accounting.",
    evidence: "trace:9f2a · 1,284 spans",
    kind: "observe",
  },
  {
    id: "T-02",
    actor: "investigator",
    title: "Opened three competing hypotheses",
    detail: "Currency timeout, payment saturation, and checkout configuration regression remain plausible.",
    evidence: "hypotheses:v1",
    kind: "reason",
  },
  {
    id: "T-03",
    actor: "tool",
    title: "Correlated the deploy window",
    detail: "checkout-service config v47 changed 96 seconds before the first error. No payment deploy occurred.",
    evidence: "deploy:checkout-v47",
    kind: "query",
  },
  {
    id: "T-04",
    actor: "verifier",
    title: "Tried to falsify the leading diagnosis",
    detail: "Queried healthy regions and pre-deploy traces. The failure appears only where v47 is active.",
    evidence: "query:region-diff-04",
    kind: "challenge",
  },
  {
    id: "T-05",
    actor: "tool",
    title: "Found the broken contract",
    detail: "PAYMENT_TIMEOUT_MS changed from integer 2500 to string ‘2.5s’; the checkout parser falls back to 0.",
    evidence: "config:diff-L18",
    kind: "confirm",
  },
  {
    id: "T-06",
    actor: "verifier",
    title: "Verified the causal chain",
    detail: "Replaying v47 reproduces the timeout cascade. Reverting only that key restores 99.97% success.",
    evidence: "sandbox:replay-17",
    kind: "confirm",
  },
];

const benchmarkRows = [
  { scenario: "Bad timeout type", baseline: "checkout", faultline: "checkout", truth: "checkout", covered: true },
  { scenario: "CPU saturation", baseline: "recommendation", faultline: "recommendation", truth: "recommendation", covered: true },
  { scenario: "Expired certificate", baseline: "frontend", faultline: "gateway", truth: "gateway", covered: true },
  { scenario: "Cache eviction storm", baseline: "checkout", faultline: "cart", truth: "cart", covered: true },
  { scenario: "DNS resolution delay", baseline: "shipping", faultline: "dns", truth: "dns", covered: true },
  { scenario: "Schema incompatibility", baseline: "orders", faultline: "catalog", truth: "catalog", covered: true },
  { scenario: "Memory leak", baseline: "email", faultline: "email", truth: "email", covered: true },
  { scenario: "Queue partition", baseline: "accounting", faultline: "kafka", truth: "kafka", covered: true },
  { scenario: "Rate-limit cascade", baseline: "currency", faultline: "currency", truth: "currency", covered: true },
  { scenario: "Connection pool exhaustion", baseline: "frontend", faultline: "orders-db", truth: "orders-db", covered: true },
  { scenario: "Clock skew", baseline: "auth", faultline: "identity", truth: "identity", covered: true },
  { scenario: "Regional packet loss", baseline: "checkout", faultline: "network", truth: "network", covered: false },
];

const navIncidents = [
  { id: "INC-2481", label: "Checkout error spike", severity: "SEV-1", active: true },
  { id: "INC-2479", label: "Search latency", severity: "SEV-2", active: false },
  { id: "INC-2472", label: "Email delivery lag", severity: "SEV-3", active: false },
];

function Mark({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "danger" | "good" | "amber" }) {
  return <span className={`mark mark-${tone}`}>{children}</span>;
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [panel, setPanel] = useState<Panel>("investigation");
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [selectedStep, setSelectedStep] = useState(0);

  useEffect(() => {
    if (phase !== "running") return;
    if (visibleSteps >= steps.length) {
      const done = window.setTimeout(() => setPhase("ready"), 450);
      return () => window.clearTimeout(done);
    }
    const timer = window.setTimeout(() => {
      setVisibleSteps((value) => value + 1);
      setSelectedStep(visibleSteps);
    }, visibleSteps === 0 ? 350 : 720);
    return () => window.clearTimeout(timer);
  }, [phase, visibleSteps]);

  useEffect(() => {
    if (phase !== "recovering") return;
    const timer = window.setTimeout(() => setPhase("resolved"), 1800);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const confidence = phase === "idle" ? 0 : Math.min(96, 22 + visibleSteps * 13);

  function beginInvestigation() {
    setPanel("investigation");
    setVisibleSteps(0);
    setSelectedStep(0);
    setPhase("running");
  }

  const investigationComplete = phase === "ready" || phase === "recovering" || phase === "resolved";

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true"><span>F</span></div>
          <div>
            <div className="brand-name">FAULTLINE</div>
            <div className="brand-caption">INCIDENT INTELLIGENCE</div>
          </div>
        </div>

        <nav className="primary-nav" aria-label="Primary navigation">
          <button className={`nav-button ${panel === "investigation" ? "nav-active" : ""}`} onClick={() => setPanel("investigation")}><span className="nav-glyph">⌁</span> Investigation</button>
          <button className={`nav-button ${panel === "recovery" ? "nav-active" : ""}`} onClick={() => setPanel("recovery")}><span className="nav-glyph">↺</span> Recovery lab</button>
          <button className={`nav-button ${panel === "postmortem" ? "nav-active" : ""}`} onClick={() => setPanel("postmortem")}><span className="nav-glyph">▤</span> Postmortem</button>
          <button className={`nav-button ${panel === "runbook" ? "nav-active" : ""}`} onClick={() => setPanel("runbook")}><span className="nav-glyph">◇</span> Runbook memory</button>
          <button className={`nav-button ${panel === "benchmark" ? "nav-active" : ""}`} onClick={() => setPanel("benchmark")}><span className="nav-glyph">↗</span> Evaluations</button>
          <button className={`nav-button ${panel === "trajectory" ? "nav-active" : ""}`} onClick={() => setPanel("trajectory")}><span className="nav-glyph">⋮</span> Audit trail</button>
        </nav>

        <div className="sidebar-label">OPEN INCIDENTS <span>3</span></div>
        <div className="incident-list">
          {navIncidents.map((incident) => (
            <button key={incident.id} className={`incident-link ${incident.active ? "incident-active" : ""}`}>
              <span className={`severity-dot ${incident.severity === "SEV-1" ? "dot-red" : incident.severity === "SEV-2" ? "dot-amber" : "dot-muted"}`} />
              <span className="incident-copy"><strong>{incident.label}</strong><small>{incident.id} · {incident.severity}</small></span>
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="live-pill"><span className="pulse-dot" /> SIMULATION MODE</div>
          <p>Every action is sandboxed.<br />Production requires approval.</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="breadcrumb"><span>INCIDENTS</span><b>/</b><strong>INC-2481</strong></div>
          <div className="topbar-actions">
            <div className="connection-state"><span /> 6 sources connected</div>
            <button className="icon-button" aria-label="Open command palette">⌘ K</button>
            <div className="avatar">AD</div>
          </div>
        </header>

        <div className="content">
          <section className="incident-header">
            <div>
              <div className="eyebrow"><Mark tone={phase === "resolved" ? "good" : "danger"}>{phase === "resolved" ? "RESOLVED" : "SEV-1 ACTIVE"}</Mark><span>Started 14:07 UTC · 18 min ago</span></div>
              <h1>Checkout failures after<br /><em>configuration rollout</em></h1>
              <p>34.8% of checkout requests are failing across eu-west. Payment, email and accounting show downstream errors.</p>
            </div>
            <div className="incident-actions">
              <button className="secondary-button">Share report</button>
              <button className="primary-button" onClick={beginInvestigation} disabled={phase === "running" || phase === "recovering"}>
                {phase === "running" ? "Investigating…" : phase === "idle" ? "Run investigation" : "Run again"}
                <span>→</span>
              </button>
            </div>
          </section>

          <section className="metric-grid" aria-label="Incident metrics">
            <article className="metric-card"><span className="metric-label">REQUEST SUCCESS</span><strong className={phase === "resolved" ? "metric-green" : "metric-red"}>{phase === "resolved" ? "99.97%" : "65.2%"}</strong><small>{phase === "resolved" ? "Recovered in sandbox" : "↓ 34.7 pts from baseline"}</small></article>
            <article className="metric-card"><span className="metric-label">ROOT-CAUSE CONFIDENCE</span><strong>{confidence}%</strong><div className="meter"><i style={{ "--fill": `${confidence}%` } as CSSProperties} /></div></article>
            <article className="metric-card"><span className="metric-label">EVIDENCE COVERAGE</span><strong>{investigationComplete ? "6 / 6" : `${visibleSteps} / 6`}</strong><small>{investigationComplete ? "All claims source-linked" : "Gathering observations"}</small></article>
            <article className="metric-card"><span className="metric-label">CAUSAL PROOF</span><strong>{investigationComplete ? "PASS" : "—"}</strong><small>{investigationComplete ? "1 variable changed · symptom cleared" : "Requires counterfactual replay"}</small></article>
          </section>

          <div className="panel-tabs" role="tablist" aria-label="Incident views">
            <button role="tab" aria-selected={panel === "investigation"} className={panel === "investigation" ? "tab-active" : ""} onClick={() => setPanel("investigation")}>Investigation</button>
            <button role="tab" aria-selected={panel === "trajectory"} className={panel === "trajectory" ? "tab-active" : ""} onClick={() => setPanel("trajectory")}>Agent trajectory <span>{visibleSteps}</span></button>
            <button role="tab" aria-selected={panel === "benchmark"} className={panel === "benchmark" ? "tab-active" : ""} onClick={() => setPanel("benchmark")}>Baseline comparison</button>
          </div>

          {panel === "investigation" && (
            <section className="investigation-grid">
              <article className="evidence-panel surface">
                <div className="panel-heading">
                  <div><span className="section-kicker">CAUSAL EVIDENCE GRAPH</span><h2>What happened, in order</h2></div>
                  <Mark tone={investigationComplete ? "good" : "neutral"}>{investigationComplete ? "CHAIN VERIFIED" : phase === "running" ? "INVESTIGATING" : "AWAITING RUN"}</Mark>
                </div>

                {phase === "idle" ? (
                  <div className="empty-state">
                    <div className="empty-radar"><span /><span /><i /></div>
                    <h3>Ready to investigate</h3>
                    <p>Faultline will inventory the telemetry, open competing hypotheses and try to disprove its leading diagnosis.</p>
                    <button onClick={beginInvestigation}>Begin evidence collection</button>
                  </div>
                ) : (
                  <div className="causal-chain">
                    <div className="chain-line" />
                    {steps.slice(0, visibleSteps).map((step, index) => (
                      <button key={step.id} className={`chain-step step-${step.kind} ${selectedStep === index ? "step-selected" : ""}`} onClick={() => setSelectedStep(index)}>
                        <span className="step-node">{index + 1}</span>
                        <span className="step-time">14:{index === 0 ? "07" : `0${8 + index}`}</span>
                        <span className="step-main"><strong>{step.title}</strong><small>{step.detail}</small></span>
                        <span className="evidence-chip">{step.evidence}</span>
                      </button>
                    ))}
                    {phase === "running" && <div className="thinking-row"><span className="thinking-dot" /><span>Agent is selecting the next discriminating query</span><i /><i /><i /></div>}
                  </div>
                )}
              </article>

              <aside className="diagnosis-column">
                <article className={`diagnosis-card surface ${investigationComplete ? "diagnosis-ready" : ""}`}>
                  <div className="diagnosis-topline"><span className="section-kicker">LEADING DIAGNOSIS</span><strong>{confidence}%</strong></div>
                  <h2>{visibleSteps >= 5 ? "Malformed timeout configuration" : visibleSteps >= 3 ? "Checkout configuration regression" : visibleSteps ? "Evidence still incomplete" : "No diagnosis yet"}</h2>
                  <p>{visibleSteps >= 5 ? "Config v47 changed PAYMENT_TIMEOUT_MS to an unsupported duration string. The parser defaults to zero, causing an immediate downstream timeout cascade." : "Faultline will keep multiple explanations alive until retrieved evidence can distinguish between them."}</p>
                  <div className="diagnosis-facts">
                    <div><span>ROOT SERVICE</span><strong>{visibleSteps >= 3 ? "checkout-service" : "—"}</strong></div>
                    <div><span>FAULT TYPE</span><strong>{visibleSteps >= 5 ? "config / type" : "—"}</strong></div>
                  </div>
                  {visibleSteps >= 4 && <div className="falsification-note"><span>✓</span><div><strong>Survived falsification</strong><small>Healthy regions, pre-deploy traces and payment saturation were checked.</small></div></div>}
                </article>

                <article className="hypotheses-card surface">
                  <div className="panel-heading compact"><div><span className="section-kicker">HYPOTHESIS COMPETITION</span><h3>Alternatives considered</h3></div></div>
                  <div className="hypothesis-row"><span>1</span><div><strong>Checkout config regression</strong><small>4 supporting · 0 contradicting</small></div><b className="score-high">0.96</b></div>
                  <div className="hypothesis-row muted"><span>2</span><div><strong>Payment saturation</strong><small>1 supporting · 3 contradicting</small></div><b>0.18</b></div>
                  <div className="hypothesis-row muted"><span>3</span><div><strong>Currency timeout</strong><small>0 supporting · 2 contradicting</small></div><b>0.07</b></div>
                </article>

                {investigationComplete && (
                  <article className={`recovery-card ${phase === "resolved" ? "recovery-done" : ""}`}>
                    <div className="recovery-head"><Mark tone={phase === "resolved" ? "good" : "amber"}>{phase === "resolved" ? "RECOVERY VERIFIED" : "APPROVAL REQUIRED"}</Mark><span>Action R-17</span></div>
                    <h3>{phase === "resolved" ? "Service health restored" : "Revert timeout key to 2500"}</h3>
                    <p>{phase === "resolved" ? "The sandbox replay passed all health checks. No production action was taken." : "Scoped config rollback · checkout-service · eu-west only"}</p>
                    <button disabled={phase === "recovering" || phase === "resolved"} onClick={() => setPhase("recovering")}>
                      {phase === "recovering" ? "Replaying recovery…" : phase === "resolved" ? "Verified in sandbox ✓" : "Approve sandbox replay"}
                    </button>
                  </article>
                )}
              </aside>
            </section>
          )}

          {panel === "trajectory" && (
            <section className="trajectory-panel surface">
              <div className="panel-heading">
                <div><span className="section-kicker">REPRESENTATIVE AGENT TRAJECTORY</span><h2>Every decision remains inspectable</h2></div>
                <button className="secondary-button">Export JSONL</button>
              </div>
              <div className="trajectory-layout">
                <div className="trace-list">
                  {steps.map((step, index) => (
                    <button key={step.id} className={selectedStep === index ? "trace-active" : ""} onClick={() => setSelectedStep(index)}>
                      <span className={`actor-badge actor-${step.actor}`}>{step.actor === "investigator" ? "I" : step.actor === "verifier" ? "V" : "T"}</span>
                      <span><small>{step.id} · {step.actor}</small><strong>{step.title}</strong></span>
                      <b>›</b>
                    </button>
                  ))}
                </div>
                <div className="trace-detail">
                  <div className="code-label">DECISION</div>
                  <h3>{steps[selectedStep].title}</h3>
                  <p>{steps[selectedStep].detail}</p>
                  <div className="code-label">EVIDENCE RETURNED</div>
                  <pre><code>{`{\n  "source": "${steps[selectedStep].evidence}",\n  "status": "verified",\n  "used_for_next_step": true,\n  "confidence_delta": +${8 + selectedStep * 2}\n}`}</code></pre>
                  <div className="trace-integrity"><span>⌁</span><div><strong>Trace integrity preserved</strong><small>Inputs, tool outputs, feedback and retries are append-only.</small></div></div>
                </div>
              </div>
            </section>
          )}

          {panel === "benchmark" && (
            <section className="benchmark-panel surface">
              <div className="benchmark-hero">
                <div><span className="section-kicker">FROZEN EVALUATION · 12 INCIDENTS</span><h2>Correlation proposes.<br />Counterfactuals prove.</h2></div>
                <div className="benchmark-score"><span><small>DIRECT-PROMPT BASELINE</small><strong>33.3%</strong></span><b>→</b><span className="winner"><small>FAULTLINE</small><strong>100%</strong></span></div>
              </div>
              <div className="benchmark-metrics">
                <div><small>TOP-1 ROOT CAUSE</small><strong>+66.7 pts</strong><span>Primary outcome</span></div>
                <div><small>CAUSAL PROOF RATE</small><strong>100%</strong><span>Symptom cleared under intervention</span></div>
                <div><small>RECOVERY VALIDITY</small><strong>100%</strong><span>Correct target + action</span></div>
                <div><small>ACTION CONTAINMENT</small><strong>100%</strong><span>Inside allowed catalog</span></div>
              </div>
              <div className="benchmark-table" role="table" aria-label="Benchmark results">
                <div className="table-row table-head" role="row"><span>SCENARIO</span><span>BASELINE</span><span>FAULTLINE</span><span>GOLD ROOT CAUSE</span></div>
                {benchmarkRows.map((row, index) => (
                  <div className="table-row" role="row" key={row.scenario}>
                    <span><b>{String(index + 1).padStart(2, "0")}</b>{row.scenario}{!row.covered && <Mark tone="amber">CHALLENGE</Mark>}</span>
                    <span className={row.baseline === row.truth ? "correct" : "incorrect"}>{row.baseline === row.truth ? "✓" : "×"} {row.baseline}</span>
                    <span className={row.faultline === row.truth ? "correct" : "incorrect"}>{row.faultline === row.truth ? "✓" : "×"} {row.faultline}</span>
                    <span>{row.truth}</span>
                  </div>
                ))}
              </div>
              <p className="provisional-note"><strong>Evaluation contract:</strong> Fixed synthetic cases and hidden answer labels. Faultline receives an isolated action catalog, runs one-variable experiments, and must clear the symptom without regressions. The regional packet-loss challenge requires one failed experiment before the correct proof. Raw before/after artifacts ship with the repository.</p>
            </section>
          )}

          {panel === "recovery" && (
            <section className="operations-panel surface">
              <div className="panel-heading">
                <div><span className="section-kicker">RECOVERY LAB · ACTION R-17</span><h2>Rehearse the fix before production</h2></div>
                <Mark tone={investigationComplete ? "good" : "amber"}>{investigationComplete ? "4 / 4 GATES PASS" : "PROOF REQUIRED"}</Mark>
              </div>
              <div className="operation-summary">
                <div><small>PROPOSED ACTION</small><strong>Revert PAYMENT_TIMEOUT_MS to 2500</strong><span>checkout-service · eu-west · reversible</span></div>
                <div><small>RISK</small><strong>LOW</strong><span>Scoped configuration change</span></div>
                <div><small>PRODUCTION</small><strong>NOT TOUCHED</strong><span>Human approval required</span></div>
              </div>
              <div className="gate-list">
                {[
                  ["Original symptom cleared", "34.8% → 0.8% errors"],
                  ["Service health restored", "33 → 96 health score"],
                  ["No unrelated regressions", "0 failing secondary checks"],
                  ["Production isolation", "productionConnected=false"],
                ].map(([name, observed]) => <div key={name}><span>✓</span><div><strong>{name}</strong><small>{observed}</small></div><Mark tone="good">PASS</Mark></div>)}
              </div>
              <div className="approval-strip"><div><small>ROLLBACK CONDITION</small><strong>Abort if any health gate regresses or errors remain above 1%.</strong></div><button className="primary-button" disabled={!investigationComplete}>Request on-call approval <span>→</span></button></div>
            </section>
          )}

          {panel === "postmortem" && (
            <section className="operations-panel surface">
              <div className="panel-heading">
                <div><span className="section-kicker">EVIDENCE-BACKED POSTMORTEM</span><h2>The report writes itself from the trajectory</h2></div>
                <button className="secondary-button">Export Markdown</button>
              </div>
              <div className="postmortem-grid">
                <article><small>WHAT HAPPENED</small><h3>Malformed timeout configuration caused an immediate downstream cancellation cascade.</h3><p>Config v47 changed an integer timeout to an unsupported duration string. The parser fell back to zero, so checkout cancelled payment calls before they could complete.</p></article>
                <article><small>EXECUTABLE PROOF</small><h3>One variable changed. The failure disappeared.</h3><p>CF-01 reverted only PAYMENT_TIMEOUT_MS. Error rate fell from 34.8% to 0.8%, health rose to 96, and no unrelated check regressed.</p></article>
                <article><small>ALTERNATIVES REJECTED</small><ul><li>Payment saturation — healthy before checkout cancellation</li><li>Currency timeout — remained within SLO</li></ul></article>
                <article><small>LIMITATIONS</small><ul><li>Synthetic deterministic snapshot</li><li>No production action executed</li><li>Organizational impact not estimated</li></ul></article>
              </div>
              <p className="provisional-note"><strong>Integrity:</strong> Every material sentence links back to telemetry or a counterfactual experiment. The exported package includes an append-only trajectory and SHA-256 audit digest.</p>
            </section>
          )}

          {panel === "runbook" && (
            <section className="operations-panel surface">
              <div className="panel-heading">
                <div><span className="section-kicker">RUNBOOK MEMORY · RB-2481-CHECKOUT</span><h2>Every resolved incident becomes a regression guard</h2></div>
                <Mark tone="good">COMPILED</Mark>
              </div>
              <div className="runbook-flow">
                <article><span>01</span><small>TRIGGER</small><h3>Checkout errors rise after a timeout configuration change</h3><p>Match topology, parser log signature, and propagation order.</p></article>
                <b>→</b>
                <article><span>02</span><small>VERIFY</small><h3>Replay the scoped config reversal</h3><p>Require errors ≤ 1%, health ≥ 90, and zero secondary regressions.</p></article>
                <b>→</b>
                <article><span>03</span><small>RECOVER</small><h3>Propose the catalog-bound rollback</h3><p>Never auto-execute. Route the proof package to the on-call approver.</p></article>
              </div>
              <div className="regression-spec"><div><small>MACHINE-READABLE ASSERTION</small><code>revert-config-key must clear INC-2481 with error_rate_pct &lt;= 1</code></div><button className="secondary-button">Open JSON artifact</button></div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
