"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

const lifecycle = [
  { step: "01", title: "Observe the whole fault surface", copy: "Normalize metrics, logs, traces, changes, topology and allowed actions into one incident bundle." },
  { step: "02", title: "Prove the cause", copy: "Compete hypotheses, change one suspected variable in an isolated snapshot, and measure whether the failure disappears." },
  { step: "03", title: "Rehearse recovery", copy: "Gate the proposed action against symptom clearance, restored health, secondary regressions and production isolation." },
  { step: "04", title: "Turn resolution into memory", copy: "Generate the postmortem, audit trail and a machine-readable runbook that becomes the next regression guard." },
];

export default function LandingPage() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let observer: IntersectionObserver | undefined;
    const context = gsap.context(() => {
      gsap.from(".hero-reveal", { y: 34, opacity: 0, duration: 1, stagger: 0.1, ease: "power3.out" });
      gsap.from(".hero-stage", { scale: 0.96, opacity: 0, duration: 1.25, delay: 0.12, ease: "power3.out" });
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          gsap.to(entry.target, { y: 0, opacity: 1, duration: 0.85, ease: "power3.out" });
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: 0.16 });
      observer = revealObserver;
      root.querySelectorAll(".scroll-reveal").forEach((element) => {
        gsap.set(element, { y: 45, opacity: 0 });
        revealObserver.observe(element);
      });
    }, root);
    return () => {
      observer?.disconnect();
      context.revert();
    };
  }, []);

  return (
    <main ref={rootRef} className="landing-shell">
      <nav className="landing-nav">
        <Link className="wordmark" href="/"><span>✦</span> Faultline</Link>
        <div className="landing-links"><a href="#system">System</a><a href="#proof">Proof Lab</a><a href="#benchmark">Benchmarks</a><a href="#learn">Runbooks</a></div>
        <Link className="pill-button pill-dark" href="/dashboard">Launch Incident OS <span>↗</span></Link>
      </nav>

      <section className="hero-stage">
        <div className="hero-copy">
          <span className="hero-reveal micro-label">FRONTIER AGENTIC INCIDENT ENGINEERING</span>
          <h1 className="hero-reveal">Incidents don’t need another explanation.<br /><em>They need proof.</em></h1>
          <p className="hero-reveal">Faultline watches real public operational signals, remembers exactly what it saw, and proves suspected causes inside isolated snapshots—before a human-approved recovery ever touches production.</p>
          <div className="hero-reveal hero-actions"><Link className="pill-button pill-light" href="/dashboard">Run the hard case <span>→</span></Link><a className="text-link" href="#system">See the full system ↓</a></div>
        </div>
        <div className="hero-proof-row">
          <div className="hero-proof"><span>PROOF LAB BASELINE</span><strong>33.3%</strong><small>root-cause accuracy</small></div>
          <div className="hero-proof"><span>PROOF LAB · FAULTLINE</span><strong>100%</strong><small>causal proof rate</small></div>
        </div>
      </section>

      <section id="system" className="intro-section scroll-reveal">
        <div><span className="section-index">01 / INCIDENT OS</span><h2>From alert to reusable operational memory.</h2><Link className="pill-button pill-dark" href="/dashboard">Explore the system</Link></div>
        <p>Faultline is an end-to-end operating system for high-pressure incident response. Live Pulse captures real operational evidence into append-only memory; Proof Lab tests causality, rehearses recovery, preserves human control, and converts every verified resolution into a regression guard.</p>
      </section>

      <section className="value-grid scroll-reveal">
        <article className="value-card value-card-visual"><span className="card-number">01</span><h3>Causality you can execute</h3><p>Evidence proposes. A one-variable intervention proves.</p><div className="mini-orbit"><i /><i /><i /><b>PROOF</b></div></article>
        <article className="value-card value-card-dark"><span className="card-number">02</span><h3>Recovery without roulette</h3><p>Every action is catalog-bound, rehearsed against health gates, and held for human approval.</p><div className="gate-stack"><span>Symptom cleared <b>PASS</b></span><span>Health restored <b>PASS</b></span><span>No regressions <b>PASS</b></span></div></article>
        <article className="value-card value-card-purple"><span className="card-number">03</span><h3>Every incident compounds</h3><p>Proof becomes a postmortem. Recovery becomes a runbook. Failure becomes a test.</p><div className="memory-lines"><i /><i /><i /><i /></div></article>
      </section>

      <div className="credibility-strip scroll-reveal"><span>3 LIVE PUBLIC SOURCES</span><span>12 SYNTHETIC PROOF CASES</span><span>APPEND-ONLY MEMORY</span><span>ZERO PRODUCTION ACTIONS</span><span>REPLAY SUITE &lt; 1 SEC</span></div>

      <section className="evaluation-section scroll-reveal" aria-labelledby="evaluation-heading">
        <div className="evaluation-heading"><span className="section-index">02 / VERIFIABLE BY DESIGN</span><h2 id="evaluation-heading">Built to survive a judge’s clean-room test.</h2><p>The product, benchmark, and repository tell the same story. Every claim has a runnable path to evidence.</p></div>
        <div className="evaluation-grid">
          <article><span>01</span><small>AGENT SOLUTION &amp; ENGINEERING</small><h3>Purposeful tool use</h3><p>Competing hypotheses, contradiction checks, isolated interventions, and a skeptical verifier—not a decorated chatbot.</p></article>
          <article><span>02</span><small>REPRODUCIBILITY</small><h3>One-command replay</h3><p>Versioned synthetic inputs, exact commands, expected outputs, tests, and inspectable JSONL trajectories.</p></article>
          <article><span>03</span><small>MEASURED IMPROVEMENT</small><h3>Same cases. Fair baseline.</h3><p>Top-1 accuracy moves from 33.3% to 100%; every iteration is connected to evidence in the changelog.</p></article>
          <article><span>04</span><small>END-TO-END QUALITY</small><h3>Useful after diagnosis</h3><p>Proof flows into rehearsal, human approval, postmortem evidence, and a reusable regression runbook.</p></article>
        </div>
      </section>

      <section id="proof" className="lifecycle-section">
        <div className="lifecycle-intro scroll-reveal"><span className="section-index">03 / THE WORKFLOW</span><h2>One agentic loop.<br />Four operational outcomes.</h2><p>Not a collection of AI features. One coherent system whose stages verify one another.</p></div>
        <div className="lifecycle-stack">
          {lifecycle.map((item) => <article className="lifecycle-card scroll-reveal" key={item.step}><span>{item.step}</span><div><small>FAULTLINE STAGE</small><h3>{item.title}</h3><p>{item.copy}</p></div><b>↗</b></article>)}
        </div>
      </section>

      <section id="benchmark" className="hard-case-section scroll-reveal">
        <div className="hard-case-copy"><span className="section-index">04 / THE HARD CASE</span><h2>The obvious answer is wrong.<br />Faultline proves why.</h2><p>A checkout canary begins just before regional packet loss. A normal assistant blames the deploy. Faultline tests it—and learns from being wrong.</p><Link className="pill-button pill-light" href="/dashboard">Watch the investigation</Link></div>
        <div className="experiment-board">
          <div className="experiment-head"><span>INC-2492 / EU-SOUTH</span><b>COUNTERFACTUAL LOG</b></div>
          <article><span>CF-01</span><div><small>CHECKOUT ROLLBACK</small><strong>19% → 19%</strong><p>Packet loss survives. Hypothesis rejected.</p></div><b className="reject">REJECTED</b></article>
          <article><span>CF-02</span><div><small>NETWORK REROUTE</small><strong>19% → 0.8%</strong><p>Cross-service failure clears. No regressions.</p></div><b className="pass">CAUSAL</b></article>
        </div>
      </section>

      <section id="learn" className="closing-section scroll-reveal"><span>FAULTLINE / INCIDENT OS</span><h2>Stop narrating incidents.<br /><em>Start proving them.</em></h2><Link className="pill-button pill-light" href="/dashboard">Enter the command center <span>→</span></Link></section>
      <footer><Link className="wordmark" href="/"><span>✦</span> Faultline</Link><p>Built for inspectable, reproducible incident response.</p><span>© 2026 XAIDEN LABS</span></footer>
    </main>
  );
}
