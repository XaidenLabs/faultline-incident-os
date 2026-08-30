"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

const lifecycle = [
  { step: "01", title: "Collect the full picture", copy: "Bring the alerts, logs, traces, recent changes, service map, and allowed actions into one case." },
  { step: "02", title: "Test the likely causes", copy: "Change one suspected cause in a safe copy of the incident and see whether the failure disappears." },
  { step: "03", title: "Check the recovery", copy: "Confirm that the original problem clears, health improves, and nothing else breaks." },
  { step: "04", title: "Save what worked", copy: "Turn the evidence into a postmortem, recovery guide, and test for the next incident." },
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
        <div className="landing-links"><a href="#system">System</a><Link href="/evidence">How it works</Link><Link href="/docs">Simple guide</Link><a href="#benchmark">Results</a></div>
        <Link className="pill-button pill-dark" href="/dashboard">Launch Incident OS <span>↗</span></Link>
      </nav>

      <section className="hero-stage">
        <div className="hero-copy">
          <span className="hero-reveal micro-label">LIVE INCIDENT EVIDENCE + SAFE CAUSAL TESTS</span>
          <h1 className="hero-reveal">Incidents don’t need another explanation.<br /><em>They need proof.</em></h1>
          <p className="hero-reveal">Faultline watches live public incident signals, saves exactly what it saw, and tests suspected causes inside a safe copy of the failure. Production is never changed automatically.</p>
          <div className="hero-reveal hero-actions"><Link className="pill-button pill-light" href="/dashboard">Run the hard case <span>→</span></Link><a className="text-link" href="#system">See the full system ↓</a></div>
        </div>
        <div className="hero-proof-row">
          <div className="hero-proof"><span>CONTROLLED TEST · BASELINE</span><strong>33.3%</strong><small>correct root cause</small></div>
          <div className="hero-proof"><span>CONTROLLED TEST · FAULTLINE</span><strong>100%</strong><small>cases with causal proof</small></div>
        </div>
      </section>

      <section id="system" className="intro-section scroll-reveal">
        <div><span className="section-index">01 / INCIDENT OS</span><h2>From alert to reusable operational memory.</h2><Link className="pill-button pill-dark" href="/dashboard">Explore the system</Link></div>
        <p>Live Pulse records real public evidence. The Counterfactual Lab uses fixed test incidents to check whether changing a suspected cause actually removes the failure. Successful tests become recovery plans, postmortems, and reusable runbooks.</p>
      </section>

      <section className="value-grid scroll-reveal">
        <article className="value-card value-card-visual"><span className="card-number">01</span><h3>Causality you can execute</h3><p>Evidence proposes. A one-variable intervention proves.</p><div className="mini-orbit"><i /><i /><i /><b>PROOF</b></div></article>
        <article className="value-card value-card-dark"><span className="card-number">02</span><h3>Recovery without roulette</h3><p>Every action is catalog-bound, rehearsed against health gates, and held for human approval.</p><div className="gate-stack"><span>Symptom cleared <b>PASS</b></span><span>Health restored <b>PASS</b></span><span>No regressions <b>PASS</b></span></div></article>
        <article className="value-card value-card-purple"><span className="card-number">03</span><h3>Every incident compounds</h3><p>Proof becomes a postmortem. Recovery becomes a runbook. Failure becomes a test.</p><div className="memory-lines"><i /><i /><i /><i /></div></article>
      </section>

      <div className="credibility-strip scroll-reveal"><span>3 LIVE PUBLIC SOURCES</span><span>12 SYNTHETIC PROOF CASES</span><span>APPEND-ONLY MEMORY</span><span>ZERO PRODUCTION ACTIONS</span><span>REPLAY SUITE &lt; 1 SEC</span></div>

      <section className="evaluation-section scroll-reveal" aria-labelledby="evaluation-heading">
        <div className="evaluation-heading"><span className="section-index">02 / CHECK THE CLAIMS</span><h2 id="evaluation-heading">Do not take our word for it.</h2><p>The product, test cases, and repository show where every number came from and how to reproduce it.</p></div>
        <div className="evaluation-grid">
          <article><span>01</span><small>HOW IT REASONS</small><h3>It challenges its first answer</h3><p>Faultline keeps more than one possible cause and actively looks for evidence that could prove its leading idea wrong.</p></article>
          <article><span>02</span><small>HOW TO REPEAT IT</small><h3>One-command replay</h3><p>The same fixed inputs, commands, expected results, tests, and readable event trails are included.</p></article>
          <article><span>03</span><small>WHAT IMPROVED</small><h3>Same cases. Fair comparison.</h3><p>Correct root-cause identification moves from 33.3% to 100% on the twelve controlled test incidents.</p></article>
          <article><span>04</span><small>WHAT THE USER GETS</small><h3>Useful after diagnosis</h3><p>The proven cause becomes a checked recovery plan, a postmortem, and a reusable runbook.</p></article>
        </div>
      </section>

      <section id="proof" className="lifecycle-section">
        <div className="lifecycle-intro scroll-reveal"><span className="section-index">03 / THE WORKFLOW</span><h2>From live signal<br />to checked recovery.</h2><p>Each step produces evidence that the next step can inspect.</p></div>
        <div className="lifecycle-stack">
          {lifecycle.map((item) => <article className="lifecycle-card scroll-reveal" key={item.step}><span>{item.step}</span><div><small>FAULTLINE STAGE</small><h3>{item.title}</h3><p>{item.copy}</p></div><b>↗</b></article>)}
        </div>
      </section>

      <section id="benchmark" className="hard-case-section scroll-reveal">
        <div className="hard-case-copy"><span className="section-index">04 / THE HARD CASE</span><h2>The obvious answer is wrong.<br />Faultline proves why.</h2><p>Checkout has the loudest error and its canary began 80 seconds before the alert. Faultline tests checkout first, sees that the failure remains, and then proves the shared network path.</p><Link className="pill-button pill-light" href="/dashboard?mode=proof-lab">Watch the investigation</Link></div>
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
